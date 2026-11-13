import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, requireUserSession } from "../_shared/auth.ts";

// create-export-pack — builds and persists a structured export pack
// (prompts, production specs, SEO copy) for a sealed collection.
//
// Governance:
//   - verify_jwt = true at the platform level + requireUserSession + requireAdmin
//   - collection ownership enforced (same rule as approve-hq)
//   - all 3 seals (brand_dna, finance_gate, production_ready) must be approved
//   - this function NEVER writes collections.lifecycle_status or collections.status:
//     lifecycle transitions belong to lifecycle-gate only.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const REQUIRED_SEALS = ["brand_dna", "finance_gate", "production_ready"] as const;
const EXPORTABLE_STATUSES = ["approved_for_production", "in_production", "ready_for_export"];

interface DesignRow {
  id: string;
  title: string | null;
  prompt: string | null;
  product_type: string | null;
  print_type: string | null;
  image_url: string | null;
  created_at: string;
}

interface CollectionItemRow {
  id: string;
  design_id: string;
  sku: string | null;
  position: number | null;
  design_prompt: string | null;
  negative_prompt: string | null;
  provider: string | null;
  print_type: string | null;
  aop_spec: unknown;
  personalization: boolean | null;
  retail_price: number | null;
  cost: number | null;
  margin: number | null;
  designs: DesignRow | DesignRow[] | null;
}

interface StoryRow {
  design_id: string | null;
  shopify_description: string | null;
  punchlines: string[] | null;
  status: string;
  updated_at: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function pickDesign(designs: CollectionItemRow["designs"]): DesignRow | null {
  if (!designs) return null;
  if (!Array.isArray(designs)) return designs;
  return (
    [...designs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const session = await requireUserSession(req);
    if (!session.ok) return json({ error: session.error }, session.status);

    const admin = await requireAdmin(session.sub);
    if (!admin.ok) return json({ error: admin.error }, admin.status);

    const userId = session.sub;
    const supabase = admin.adminClient;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const collectionId = typeof body.collectionId === "string" ? body.collectionId.trim() : "";
    if (!collectionId) {
      return json({ error: "Missing collectionId" }, 400);
    }

    // ── Collection + SKUs + designs ──
    const { data: collection, error: fetchErr } = await supabase
      .from("collections")
      .select("id, name, season, description, lifecycle_status, user_id, collection_items(*, designs(*))")
      .eq("id", collectionId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[create-export-pack] collection fetch failed", fetchErr);
      return json({ error: "Collection lookup failed" }, 500);
    }
    if (!collection) {
      return json({ error: "Collection not found" }, 404);
    }

    if (collection.user_id !== userId) {
      return json({ error: "Forbidden — collection ownership required" }, 403);
    }

    if (!EXPORTABLE_STATUSES.includes(collection.lifecycle_status)) {
      return json(
        {
          error: `Collection must be approved for production first. Current status: ${collection.lifecycle_status}`,
        },
        422,
      );
    }

    // ── Seal gate: all 3 seals approved ──
    const { data: seals, error: sealsErr } = await supabase
      .from("collection_seals")
      .select("seal_type, status")
      .eq("collection_id", collectionId)
      .in("seal_type", [...REQUIRED_SEALS])
      .eq("status", "approved");

    if (sealsErr) {
      console.error("[create-export-pack] seal lookup failed", sealsErr);
      return json({ error: "Seal lookup failed" }, 500);
    }

    const approvedSeals = new Set((seals ?? []).map((s: { seal_type: string }) => s.seal_type));
    const missingSeals = REQUIRED_SEALS.filter((t) => !approvedSeals.has(t));
    if (missingSeals.length > 0) {
      return json(
        { error: "All 3 seals must be approved before export", missing_seals: missingSeals },
        422,
      );
    }

    const items = ((collection.collection_items ?? []) as CollectionItemRow[]).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    if (items.length === 0) {
      return json({ error: "Collection has no SKUs to export" }, 422);
    }

    // ── SEO copy source: stories (design-level first, collection-level fallback) ──
    const { data: stories, error: storiesErr } = await supabase
      .from("stories")
      .select("design_id, shopify_description, punchlines, status, updated_at")
      .eq("collection_id", collectionId)
      .order("updated_at", { ascending: false });

    if (storiesErr) {
      console.error("[create-export-pack] stories lookup failed", storiesErr);
      return json({ error: "Stories lookup failed" }, 500);
    }

    const storyRows = (stories ?? []) as StoryRow[];
    const storyByDesign = new Map<string, StoryRow>();
    let collectionStory: StoryRow | null = null;
    for (const story of storyRows) {
      if (story.design_id) {
        if (!storyByDesign.has(story.design_id)) storyByDesign.set(story.design_id, story);
      } else if (!collectionStory) {
        collectionStory = story;
      }
    }

    // ── Versioning ──
    const { data: existingPacks, error: versionErr } = await supabase
      .from("export_packs")
      .select("version")
      .eq("collection_id", collectionId)
      .order("version", { ascending: false })
      .limit(1);

    if (versionErr) {
      console.error("[create-export-pack] version lookup failed", versionErr);
      return json({ error: "Export pack version lookup failed" }, 500);
    }

    const nextVersion = (existingPacks?.[0]?.version ?? 0) + 1;
    const packId = crypto.randomUUID();
    const folderPath = `/EXPORTS/${slugify(collection.name)}/${packId}`;

    // ── Structured SKU payload ──
    const skus = items.map((item, idx) => {
      const design = pickDesign(item.designs);
      const skuName = item.sku || design?.title || `SKU-${idx + 1}`;
      const skuSlug = slugify(item.sku || `sku-${idx + 1}`);
      const story = (item.design_id && storyByDesign.get(item.design_id)) || collectionStory;
      const description = story?.shopify_description ?? collection.description ?? null;

      return {
        skuId: item.id,
        skuName,
        designId: item.design_id,
        prompts: {
          design_prompt: item.design_prompt ?? design?.prompt ?? null,
          negative_prompt: item.negative_prompt ?? null,
        },
        // Supplier-routed specs: parent apparel → Printful (DTG/Embroidery),
        // kid AOP → Kin Custom (AOP). `provider` carries the routing decision.
        production_specs: {
          provider: item.provider ?? null,
          product_type: design?.product_type ?? null,
          print_type: item.print_type ?? design?.print_type ?? null,
          aop_spec: item.aop_spec ?? null,
          personalization: item.personalization ?? false,
          mockup_url: design?.image_url ?? null,
          printfile_placeholders: [
            `${folderPath}/PRINTFILES/FRONT/${skuSlug}-front.png`,
            `${folderPath}/PRINTFILES/BACK/${skuSlug}-back.png`,
          ],
        },
        pricing: {
          retail_price_cad: item.retail_price,
          cost_cad: item.cost,
          margin: item.margin,
        },
        seo_copy: {
          title: `${collection.name} — ${skuName}`,
          description,
          punchlines: story?.punchlines ?? [],
          source: story ? "stories" : description ? "collection" : "missing",
        },
      };
    });

    const manifest = {
      collectionId: collection.id,
      collectionName: collection.name,
      season: collection.season,
      lifecycleStatus: collection.lifecycle_status,
      sealsApproved: [...REQUIRED_SEALS],
      createdAt: new Date().toISOString(),
      version: nextVersion,
      folderStructure: {
        root: folderPath,
        mockupsHQ: `${folderPath}/MOCKUPS/HQ/`,
        printfilesFront: `${folderPath}/PRINTFILES/FRONT/`,
        printfilesBack: `${folderPath}/PRINTFILES/BACK/`,
        manifestJson: `${folderPath}/manifest.json`,
        shopifyProducts: `${folderPath}/shopify_products.json`,
      },
      skus,
    };

    // ── Persist pack (single insert with the final manifest) ──
    const { error: packErr } = await supabase.from("export_packs").insert({
      id: packId,
      collection_id: collectionId,
      manifest,
      folder_path: folderPath,
      status: "created",
      created_by: userId,
      version: nextVersion,
    });

    if (packErr) {
      console.error("[create-export-pack] pack insert failed", packErr);
      return json({ error: "Failed to create export pack" }, 500);
    }

    const packItems = skus.map((sku) => ({
      export_pack_id: packId,
      sku_name: sku.skuName,
      product_type: sku.production_specs.product_type,
      retail_price_cad: sku.pricing.retail_price_cad,
      cost_cad: sku.pricing.cost_cad,
      margin: sku.pricing.margin,
      mockup_url: sku.production_specs.mockup_url,
      printfile_placeholders: sku.production_specs.printfile_placeholders,
    }));

    const { error: itemsErr } = await supabase.from("export_pack_items").insert(packItems);
    if (itemsErr) {
      console.error("[create-export-pack] pack items insert failed", itemsErr);
      // Roll back the half-written pack (items cascade on delete).
      const { error: rollbackErr } = await supabase.from("export_packs").delete().eq("id", packId);
      if (rollbackErr) console.error("[create-export-pack] rollback failed", rollbackErr);
      return json({ error: "Failed to create export pack items" }, 500);
    }

    // Audit trail only — lifecycle_status is unchanged (from_status === to_status).
    const { error: eventErr } = await supabase.from("collection_events").insert({
      collection_id: collectionId,
      event_type: "export_pack_created",
      from_status: collection.lifecycle_status,
      to_status: collection.lifecycle_status,
      user_id: userId,
    });
    if (eventErr) {
      // Non-fatal: the pack exists and is consistent; surface the audit gap in logs.
      console.error("[create-export-pack] audit event insert failed", eventErr);
    }

    console.log(`[create-export-pack] ${collectionId}: pack ${packId} v${nextVersion}`);
    return json({ exportPackId: packId, version: nextVersion, manifest });
  } catch (error) {
    console.error("[create-export-pack] error", error);
    return json({ error: "Internal server error" }, 500);
  }
});
