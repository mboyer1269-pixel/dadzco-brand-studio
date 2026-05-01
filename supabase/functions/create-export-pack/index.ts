import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Disabled intentionally until the export workflow is reviewed and aligned with lifecycle governance.
  return new Response(
    JSON.stringify({
      error: "create-export-pack is disabled pending export workflow review",
      disabled: true,
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { collectionId } = await req.json();
    if (!collectionId) {
      return new Response(JSON.stringify({ error: "Missing collectionId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX B: fetch designs as single object via design_id FK (1:1)
    const { data: collection, error: fetchErr } = await supabase
      .from("collections")
      .select("*, collection_items(*, designs(*))")
      .eq("id", collectionId)
      .single();

    if (fetchErr || !collection) {
      return new Response(JSON.stringify({ error: "Collection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX A: Ownership enforcement
    if (collection.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validStatuses = ["approved_for_production", "in_production", "ready_for_export"];
    if (!validStatuses.includes(collection.lifecycle_status)) {
      return new Response(JSON.stringify({
        error: `Collection must be approved first. Current status: ${collection.lifecycle_status}`,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingPacks } = await supabase
      .from("export_packs").select("version")
      .eq("collection_id", collectionId)
      .order("version", { ascending: false }).limit(1);
    const nextVersion = (existingPacks?.[0]?.version ?? 0) + 1;

    const collectionSlug = slugify(collection.name);

    const { data: pack, error: packErr } = await supabase
      .from("export_packs")
      .insert({
        collection_id: collectionId, manifest: {}, folder_path: "",
        status: "created", created_by: userId, version: nextVersion,
      })
      .select().single();

    if (packErr || !pack) {
      return new Response(JSON.stringify({ error: `Failed to create export pack: ${packErr?.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const folderPath = `/EXPORTS/${collectionSlug}/${pack.id}`;
    const items = collection.collection_items || [];

    const skuManifest = items.map((item: any, idx: number) => {
      // FIX B: designs is a single object via design_id FK
      let design = item.designs;
      if (Array.isArray(design)) {
        design = design.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] || null;
      }

      const skuSlug = slugify(item.sku || `sku-${idx + 1}`);
      return {
        skuId: item.id,
        skuName: item.sku || design?.title || `SKU-${idx + 1}`,
        productType: design?.product_type || "unknown",
        retailPriceCAD: item.retail_price, costCAD: item.cost, margin: item.margin,
        selectedMockupUrl: design?.image_url || null,
        printfilePlaceholders: [
          `${folderPath}/PRINTFILES/FRONT/${skuSlug}-front.png`,
          `${folderPath}/PRINTFILES/BACK/${skuSlug}-back.png`,
        ],
      };
    });

    const manifest = {
      collectionId: collection.id, collectionName: collection.name,
      season: collection.season, status: collection.lifecycle_status,
      createdAt: new Date().toISOString(), version: nextVersion,
      folderStructure: {
        root: folderPath, mockupsHQ: `${folderPath}/MOCKUPS/HQ/`,
        printfilesFront: `${folderPath}/PRINTFILES/FRONT/`,
        printfilesBack: `${folderPath}/PRINTFILES/BACK/`,
        manifestJson: `${folderPath}/manifest.json`,
        shopifyProducts: `${folderPath}/shopify_products.json`,
      },
      skus: skuManifest,
    };

    await supabase.from("export_packs").update({ manifest, folder_path: folderPath }).eq("id", pack.id);

    const packItems = skuManifest.map((sku: any) => ({
      export_pack_id: pack.id, sku_name: sku.skuName, product_type: sku.productType,
      retail_price_cad: sku.retailPriceCAD, cost_cad: sku.costCAD, margin: sku.margin,
      mockup_url: sku.selectedMockupUrl, printfile_placeholders: sku.printfilePlaceholders,
    }));

    if (packItems.length > 0) {
      await supabase.from("export_pack_items").insert(packItems);
    }

    await supabase.from("collections")
      .update({ lifecycle_status: "ready_for_export", status: "ready_for_export" })
      .eq("id", collectionId);

    await supabase.from("collection_events").insert({
      collection_id: collectionId, event_type: "export_pack_created",
      from_status: collection.lifecycle_status, to_status: "ready_for_export", user_id: userId,
    });

    console.log(`[create-export-pack] ${collectionId}: pack ${pack.id} v${nextVersion}`);
    return new Response(JSON.stringify({ exportPackId: pack.id, version: nextVersion, manifest }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-export-pack] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
