import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Lifecycle Transition Rules ─────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  idea: ["strategy_review"],
  strategy_review: ["mockup_stage", "idea"],
  mockup_stage: ["approved_for_production", "strategy_review"],
  approved_for_production: ["in_production", "mockup_stage"],
  in_production: ["ready_for_export", "approved_for_production"],
  ready_for_export: ["exported", "in_production"],
  exported: [],
};

// ─── Gate Checks ────────────────────────────────────────────────────
interface GateResult {
  passed: boolean;
  gate: string;
  message: string;
  value?: number;
  threshold?: number;
}

interface CollectionItem {
  margin: number | null;
  retail_price: number | null;
  cost: number | null;
}

async function checkGates(
  supabase: SupabaseClient,
  collectionId: string,
  targetStatus: string
): Promise<GateResult[]> {
  const results: GateResult[] = [];

  const { data: collection } = await supabase
    .from("collections")
    .select("*, collection_items(*)")
    .eq("id", collectionId)
    .single();

  if (!collection) {
    return [{ passed: false, gate: "existence", message: "Collection not found" }];
  }

  const { data: scores } = await supabase
    .from("collection_scores")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestScore = scores?.[0];

  if (targetStatus === "approved_for_production") {
    const items: CollectionItem[] = collection.collection_items || [];
    const margins = items.filter((i) => i.margin != null).map((i) => i.margin as number);
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    results.push({
      passed: avgMargin >= 55,
      gate: "margin_minimum",
      message: avgMargin >= 55
        ? `Marge moyenne OK: ${avgMargin.toFixed(1)}%`
        : `Marge insuffisante: ${avgMargin.toFixed(1)}% (min 55%)`,
      value: avgMargin,
      threshold: 55,
    });

    const adnScore = latestScore?.adn_alignment ?? 0;
    results.push({
      passed: adnScore >= 80,
      gate: "adn_alignment",
      message: adnScore >= 80
        ? `ADN alignment OK: ${adnScore}/100`
        : `ADN alignment insuffisant: ${adnScore}/100 (min 80)`,
      value: adnScore,
      threshold: 80,
    });

    results.push({
      passed: !!latestScore,
      gate: "scoring_required",
      message: latestScore
        ? `Score final: ${latestScore.final_score}/100`
        : "La collection n'a pas encore été scorée",
    });
  }

  if (targetStatus === "ready_for_export") {
    const items: CollectionItem[] = collection.collection_items || [];
    const margins = items.filter((i) => i.margin != null).map((i) => i.margin as number);
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

    results.push({
      passed: avgMargin >= 55,
      gate: "financial_margin",
      message: avgMargin >= 55
        ? `Financial Gatekeeper: marge ${avgMargin.toFixed(1)}% validée`
        : `Financial Gatekeeper BLOQUÉ: marge ${avgMargin.toFixed(1)}% < 55%`,
      value: avgMargin,
      threshold: 55,
    });

    const negativeProfitItems = items.filter(
      (i) => i.retail_price != null && i.cost != null && (i.retail_price as number) <= (i.cost as number)
    );
    results.push({
      passed: negativeProfitItems.length === 0,
      gate: "no_negative_profit",
      message: negativeProfitItems.length === 0
        ? "Aucun SKU en profit négatif"
        : `${negativeProfitItems.length} SKU(s) en profit négatif — EXPORT BLOQUÉ`,
    });

    results.push({
      passed: items.length > 0,
      gate: "has_items",
      message: items.length > 0
        ? `${items.length} SKU(s) dans la collection`
        : "Collection vide — impossible d'exporter",
    });
  }

  if (targetStatus === "exported") {
    results.push({
      passed: collection.financial_gate_passed === true,
      gate: "financial_gate_final",
      message: collection.financial_gate_passed
        ? "Financial gate validé"
        : "Le Financial Gatekeeper n'a pas validé cette collection",
    });
  }

  return results;
}

// ─── Auth Helper ────────────────────────────────────────────────────
async function authenticateRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error("Unauthorized");
  }

  return data.claims.sub as string;
}

// ─── Main Handler ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authenticateRequest(req);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { collectionId, targetStatus, force } = await req.json();
    if (!collectionId || !targetStatus) {
      throw new Error("Missing collectionId or targetStatus");
    }

    const { data: collection, error: fetchErr } = await supabase
      .from("collections")
      .select("lifecycle_status")
      .eq("id", collectionId)
      .single();

    if (fetchErr || !collection) {
      throw new Error("Collection not found");
    }

    const currentStatus = collection.lifecycle_status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      return new Response(
        JSON.stringify({
          allowed: false,
          error: `Transition invalide: ${currentStatus} → ${targetStatus}. Transitions permises: ${allowedTransitions.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gateResults = await checkGates(supabase, collectionId, targetStatus);
    const allPassed = gateResults.length === 0 || gateResults.every((g) => g.passed);

    if (!allPassed && !force) {
      return new Response(
        JSON.stringify({
          allowed: false,
          gates: gateResults,
          blockedBy: gateResults.filter((g) => !g.passed),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, unknown> = { lifecycle_status: targetStatus };
    if (targetStatus === "approved_for_production") {
      updateData.margin_validated = true;
    }
    if (targetStatus === "ready_for_export") {
      updateData.financial_gate_passed = true;
    }

    const { error: updateErr } = await supabase
      .from("collections")
      .update(updateData)
      .eq("id", collectionId);

    if (updateErr) throw new Error(`Failed to update status: ${updateErr.message}`);

    console.log(`[Lifecycle] ${collectionId}: ${currentStatus} → ${targetStatus}`);

    return new Response(
      JSON.stringify({
        allowed: true,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        gates: gateResults,
        forced: force && !allPassed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[Lifecycle Gate] Error:", e);
    const isAuth = e instanceof Error && e.message === "Unauthorized";
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: isAuth ? 401 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
