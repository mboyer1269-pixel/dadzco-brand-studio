import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GateFailure {
  gate: string;
  message: string;
  value?: number;
  threshold?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { collectionId } = await req.json();
    if (!collectionId) {
      return new Response(JSON.stringify({ error: "Missing collectionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch collection with items
    const { data: collection, error: fetchErr } = await supabase
      .from("collections")
      .select("*, collection_items(*)")
      .eq("id", collectionId)
      .single();

    if (fetchErr || !collection) {
      return new Response(JSON.stringify({ error: "Collection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest score
    const { data: scores } = await supabase
      .from("collection_scores")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestScore = scores?.[0];

    // Fetch brand_rules locked status
    const { data: brandRules } = await supabase
      .from("brand_rules")
      .select("rules_locked")
      .eq("user_id", userId)
      .limit(1);
    const rulesLocked = brandRules?.some((r: any) => r.rules_locked === true) ?? false;

    // Run gate checks
    const failures: GateFailure[] = [];
    const items = collection.collection_items || [];

    // Gate 1: at least 1 item
    if (items.length === 0) {
      failures.push({ gate: "has_items", message: "Collection must have at least 1 SKU" });
    }

    // Gate 2: avg margin >= 55%
    const margins = items.filter((i: any) => i.margin != null).map((i: any) => Number(i.margin));
    const avgMargin = margins.length > 0 ? margins.reduce((a: number, b: number) => a + b, 0) / margins.length : 0;
    if (avgMargin < 55) {
      failures.push({
        gate: "margin_minimum",
        message: `Marge moyenne insuffisante: ${avgMargin.toFixed(1)}% (min 55%)`,
        value: avgMargin,
        threshold: 55,
      });
    }

    // Gate 3: ADN alignment >= 80
    const adnScore = latestScore?.adn_alignment ?? 0;
    if (adnScore < 80) {
      failures.push({
        gate: "adn_alignment",
        message: `ADN alignment insuffisant: ${adnScore}/100 (min 80)`,
        value: adnScore,
        threshold: 80,
      });
    }

    // Gate 4: final_score >= 80
    const finalScore = latestScore?.final_score ?? 0;
    if (finalScore < 80) {
      failures.push({
        gate: "final_score",
        message: `Score final insuffisant: ${finalScore}/100 (min 80)`,
        value: finalScore,
        threshold: 80,
      });
    }

    // Gate 5: brand_rules_locked
    if (!rulesLocked) {
      failures.push({
        gate: "brand_rules_locked",
        message: "Les règles brand doivent être verrouillées dans le Brand Book Hub",
      });
    }

    // If any gate fails → 422
    if (failures.length > 0) {
      return new Response(JSON.stringify({ approved: false, failures }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All gates pass — update collection
    const hasNegativeProfit = items.some(
      (i: any) => i.retail_price != null && i.cost != null && Number(i.retail_price) <= Number(i.cost)
    );

    const updateData: Record<string, unknown> = {
      lifecycle_status: "approved_for_production",
      status: "approved_for_production",
      margin_validated: true,
    };
    if (!hasNegativeProfit && avgMargin >= 55) {
      updateData.financial_gate_passed = true;
    }

    const { error: updateErr } = await supabase
      .from("collections")
      .update(updateData)
      .eq("id", collectionId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: `Update failed: ${updateErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    await supabase.from("collection_events").insert({
      collection_id: collectionId,
      event_type: "approve_for_hq",
      from_status: collection.lifecycle_status,
      to_status: "approved_for_production",
      gate_results: failures,
      forced: false,
      user_id: userId,
    });

    console.log(`[approve-hq] ${collectionId}: approved`);

    return new Response(
      JSON.stringify({
        approved: true,
        newStatus: "approved_for_production",
        financialGatePassed: updateData.financial_gate_passed ?? false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[approve-hq] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
