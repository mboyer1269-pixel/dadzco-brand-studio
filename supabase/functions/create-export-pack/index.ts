import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Auth
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

    // Fetch collection + items + designs
    const { data: collection, error: fetchErr } = await supabase
      .from("collections")
      .select("*, collection_items(*, designs(*))")
      .eq("id", collectionId)
      .single();

    if (fetchErr || !collection) {
      return new Response(JSON.stringify({ error: "Collection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gate: must be approved_for_production or later
    const validStatuses = ["approved_for_production", "in_production", "ready_for_export"];
    if (!validStatuses.includes(collection.lifecycle_status)) {
      return new Response(
        JSON.stringify({
          error: `Collection must be approved first. Current status: ${collection.lifecycle_status}`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build deterministic manifest
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const collectionSlug = slugify(collection.name);
    const folderPath = `/EXPORTS/${collectionSlug}/${timestamp}`;

    const items = collection.collection_items || [];
    const skuManifest = items.map((item: any, idx: number) => {
      const design = item.designs;
      return {
        skuId: item.id,
        skuName: item.sku || design?.title || `SKU-${idx + 1}`,
        productType: design?.product_type || "unknown",
        retailPriceCAD: item.retail_price,
        costCAD: item.cost,
        margin: item.margin,
        selectedMockupUrl: design?.image_url || null,
        printfilePlaceholders: [
          `${folderPath}/PRINTFILES/FRONT/${slugify(item.sku || `sku-${idx + 1}`)}-front.png`,
          `${folderPath}/PRINTFILES/BACK/${slugify(item.sku || `sku-${idx + 1}`)}-back.png`,
        ],
      };
    });

    const manifest = {
      collectionId: collection.id,
      collectionName: collection.name,
      season: collection.season,
      status: collection.lifecycle_status,
      createdAt: new Date().toISOString(),
      folderStructure: {
        root: folderPath,
        mockupsHQ: `${folderPath}/MOCKUPS/HQ/`,
        printfilesFront: `${folderPath}/PRINTFILES/FRONT/`,
        printfilesBack: `${folderPath}/PRINTFILES/BACK/`,
        manifestJson: `${folderPath}/manifest.json`,
        shopifyProducts: `${folderPath}/shopify_products.json`,
      },
      skus: skuManifest,
    };

    // Save export_pack
    const { data: pack, error: packErr } = await supabase
      .from("export_packs")
      .insert({
        collection_id: collectionId,
        manifest,
        folder_path: folderPath,
        status: "created",
        created_by: userId,
      })
      .select()
      .single();

    if (packErr || !pack) {
      return new Response(JSON.stringify({ error: `Failed to create export pack: ${packErr?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save export_pack_items
    const packItems = skuManifest.map((sku: any) => ({
      export_pack_id: pack.id,
      sku_name: sku.skuName,
      product_type: sku.productType,
      retail_price_cad: sku.retailPriceCAD,
      cost_cad: sku.costCAD,
      margin: sku.margin,
      mockup_url: sku.selectedMockupUrl,
      printfile_placeholders: sku.printfilePlaceholders,
    }));

    if (packItems.length > 0) {
      const { error: itemsErr } = await supabase.from("export_pack_items").insert(packItems);
      if (itemsErr) {
        console.error("Failed to insert pack items:", itemsErr);
      }
    }

    // Update collection status to ready_for_export
    await supabase
      .from("collections")
      .update({ lifecycle_status: "ready_for_export", status: "ready_for_export" })
      .eq("id", collectionId);

    // Log event
    await supabase.from("collection_events").insert({
      collection_id: collectionId,
      event_type: "export_pack_created",
      from_status: collection.lifecycle_status,
      to_status: "ready_for_export",
      user_id: userId,
    });

    console.log(`[create-export-pack] ${collectionId}: pack ${pack.id} created`);

    return new Response(
      JSON.stringify({ exportPackId: pack.id, manifest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[create-export-pack] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
