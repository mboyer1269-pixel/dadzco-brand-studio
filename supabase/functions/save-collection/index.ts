import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SERVICE_ROLE_KEY) throw new Error("Service role key not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { collection, mockups, userId } = await req.json();
    if (!collection) throw new Error("Missing collection data");

    // Use the admin email user ID — find or use provided
    let adminUserId = userId;
    if (!adminUserId) {
      // Look up admin user
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);
      adminUserId = roles?.[0]?.user_id;
    }
    if (!adminUserId) {
      // Fallback: use a placeholder UUID for code-based auth
      adminUserId = "00000000-0000-0000-0000-000000000001";
    }

    console.log("Saving collection:", collection.name, "for user:", adminUserId);

    // 1. Insert collection
    const { data: col, error: colErr } = await supabase
      .from("collections")
      .insert({
        name: collection.name,
        description: collection.theme,
        season: collection.season,
        status: "draft",
        user_id: adminUserId,
        metadata: {
          source: "round_table",
          palette: collection.palette,
          thank_you_note: collection.thank_you_note,
          agent_notes: collection.agent_notes,
        },
      })
      .select("id")
      .single();

    if (colErr) {
      console.error("Collection insert error:", colErr);
      throw new Error(`Failed to save collection: ${colErr.message}`);
    }

    const collectionId = col.id;
    console.log("Collection saved:", collectionId);

    // 2. For each SKU: create design + collection_item + story
    const skus = collection.skus || [];
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const mockupUrl = mockups?.[i] || null;

      // Insert design
      const { data: design, error: designErr } = await supabase
        .from("designs")
        .insert({
          title: sku.name,
          mode: sku.type === "quiet" ? "quiet" : "funny",
          status: mockupUrl ? "generated" : "draft",
          image_url: mockupUrl,
          prompt: sku.mockup_brief,
          product_type: sku.products?.join(", "),
          print_type: sku.placement,
          user_id: adminUserId,
          metadata: {
            source: "round_table",
            sku_type: sku.type,
            products: sku.products,
          },
        })
        .select("id")
        .single();

      if (designErr) {
        console.error(`Design insert error for SKU ${i}:`, designErr);
        continue;
      }

      // Insert collection item
      const { error: itemErr } = await supabase
        .from("collection_items")
        .insert({
          collection_id: collectionId,
          design_id: design.id,
          position: i,
          sku: `${collection.name.toUpperCase().replace(/\s+/g, "-")}-${String(i + 1).padStart(2, "0")}`,
          cost: sku.adult_base_cost,
          retail_price: sku.adult_retail,
          margin: sku.margin_pct,
          personalization: false,
        });

      if (itemErr) {
        console.error(`Collection item error for SKU ${i}:`, itemErr);
      }

      // Insert story
      const { error: storyErr } = await supabase
        .from("stories")
        .insert({
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

      if (storyErr) {
        console.error(`Story insert error for SKU ${i}:`, storyErr);
      }
    }

    console.log(`Collection "${collection.name}" saved with ${skus.length} SKUs`);

    return new Response(
      JSON.stringify({ success: true, collectionId, skuCount: skus.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Save collection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
