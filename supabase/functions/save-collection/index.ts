import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const adminUserId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden - admin role required" }, 403);
    }

    const { collection, run_meta, mockups } = await req.json();
    if (!collection) {
      return json({ error: "Missing collection data" }, 400);
    }

    console.log("Saving collection:", collection.name, "for user:", adminUserId);

    // 1. Insert collection with full metadata
    const { data: col, error: colErr } = await supabase
      .from("collections")
      .insert({
        name: collection.name,
        description: collection.theme,
        season: collection.season || null,
        lifecycle_status: collection.finance_gate?.passed ? "idea" : "idea",
        user_id: adminUserId,
        metadata: {
          source: "round_table_v2",
          run_meta: run_meta || null,
          tagline: collection.tagline,
          why_now: collection.why_now,
          palette: collection.palette,
          finance_gate: collection.finance_gate,
          bundles: collection.bundles,
          deliverables: collection.deliverables,
          marketing_calendar: collection.marketing_calendar,
          agent_notes: collection.agent_notes,
        },
        margin_validated: collection.finance_gate?.passed || false,
        financial_gate_passed: collection.finance_gate?.passed || false,
      })
      .select("id")
      .single();

    if (colErr) {
      console.error("Collection insert error:", colErr);
      throw new Error(`Failed to save collection: ${colErr.message}`);
    }

    const collectionId = col.id;

    // 2. Insert SKUs as designs + collection_items + stories
    const skus = collection.skus || [];
    let savedCount = 0;

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const mockupUrl = mockups?.[i] || null;
      const pricing = sku.pricing || {};

      // Insert design
      const { data: design, error: designErr } = await supabase
        .from("designs")
        .insert({
          title: sku.sku_name || sku.name || `SKU-${i + 1}`,
          mode: sku.audience === "kid" ? "quiet" : "quiet",
          status: mockupUrl ? "generated" : "draft",
          image_url: mockupUrl,
          prompt: sku.design_prompt,
          product_type: sku.category,
          print_type: sku.print_type,
          negative_space_pct: 70,
          user_id: adminUserId,
          metadata: {
            source: "round_table_v2",
            audience: sku.audience,
            provider: sku.provider,
            design_direction: sku.design_direction,
            negative_prompt: sku.negative_prompt,
            aop_spec: sku.aop_spec,
          },
        })
        .select("id")
        .single();

      if (designErr) {
        console.error(`Design insert error for SKU ${i}:`, designErr);
        continue;
      }

      // Insert collection item with new columns
      const skuCode = `${collection.name.toUpperCase().replace(/[^A-Z0-9]/g, "-")}-${String(i + 1).padStart(2, "0")}`;
      const { error: itemErr } = await supabase
        .from("collection_items")
        .insert({
          collection_id: collectionId,
          design_id: design.id,
          position: i,
          sku: skuCode,
          cost: pricing.estimated_cost_cad || null,
          retail_price: pricing.retail_cad || null,
          margin: pricing.margin_pct || null,
          provider: sku.provider || "printful",
          print_type: sku.print_type || null,
          design_prompt: sku.design_prompt || null,
          negative_prompt: sku.negative_prompt || null,
          aop_spec: sku.aop_spec || null,
          personalization: false,
        });

      if (itemErr) {
        console.error(`Collection item error for SKU ${i}:`, itemErr);
      }

      // Insert story (if storytelling data exists)
      if (sku.story) {
        await supabase.from("stories").insert({
          design_id: design.id,
          collection_id: collectionId,
          mythology: sku.story?.mythology || null,
          punchlines: sku.story?.punchlines || null,
          shopify_description: sku.story?.shopify_description || null,
          tiktok_caption: sku.story?.tiktok_caption || null,
          instagram_caption: sku.story?.instagram_caption || null,
          hero_image_brief: sku.story?.hero_image_brief || null,
          status: "draft",
        });
      }

      savedCount++;
    }

    console.log(`Collection "${collection.name}" saved: ${savedCount}/${skus.length} SKUs`);

    return json({ success: true, collectionId, skuCount: savedCount });
  } catch (e) {
    console.error("Save collection error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
