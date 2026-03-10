import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ──────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ─────────────────────────────────────────────────────
const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Types ─────────────────────────────────────────────────────────
type Action =
  | "ping"
  | "publish_instagram_image"
  | "publish_instagram_carousel"
  | "publish_instagram_reel"
  | "create_campaign"
  | "create_adset"
  | "create_ad"
  | "get_insights";

interface RequestBody {
  action: Action;
  // Instagram publishing
  caption?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  // Meta Ads
  campaignName?: string;
  objective?: string;
  dailyBudget?: number;
  targeting?: Record<string, unknown>;
  adSetName?: string;
  campaignId?: string;
  adSetId?: string;
  adCreative?: {
    name: string;
    headline: string;
    body: string;
    imageUrl?: string;
    linkUrl?: string;
    callToAction?: string;
  };
  // Insights
  objectId?: string;
  datePreset?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────
function getEnvOrThrow(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing secret: ${key}`);
  return val;
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 200) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function graphPost(path: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`[Meta] Graph API error on ${path}:`, data.error);
    throw new Error(data.error.message || `Graph API error: ${res.status}`);
  }
  return data;
}

async function graphGet(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) {
    console.error(`[Meta] Graph API error on ${path}:`, data.error);
    throw new Error(data.error.message || `Graph API error: ${res.status}`);
  }
  return data;
}

// ─── Logging ───────────────────────────────────────────────────────
async function logAction(
  action: string,
  status: "success" | "error",
  metadata: Record<string, unknown> = {},
  errorMessage?: string
) {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await supabase.from("ai_generation_logs").insert({
      task_type: `meta_${action}`,
      model_provider: "meta",
      model_used: "graph_api",
      status,
      error_message: errorMessage || null,
      metadata,
    });
  } catch (e) {
    console.error("[Meta] Failed to log action:", e);
  }
}

// ─── Action Handlers ───────────────────────────────────────────────

/**
 * Ping: Validate token and return account info.
 */
async function handlePing(token: string, igUserId: string) {
  const data = await graphGet(`/${igUserId}`, { fields: "id,username,followers_count,media_count" }, token);
  return ok({ account: data });
}

/**
 * Publish a single image to Instagram.
 * Two-step: create container → publish.
 */
async function handlePublishInstagramImage(
  token: string,
  igUserId: string,
  imageUrl: string,
  caption: string
) {
  if (!imageUrl) throw new Error("imageUrl is required");

  // Step 1: Create media container
  const container = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption: caption || "",
  }, token);

  if (!container.id) throw new Error("Failed to create media container");
  console.log(`[Meta] Container created: ${container.id}`);

  // Step 2: Publish
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
  }, token);

  return ok({
    mediaId: published.id,
    containerId: container.id,
    platform: "instagram",
    type: "image",
  });
}

/**
 * Publish a carousel (2-10 images) to Instagram.
 * Multi-step: create child containers → create carousel container → publish.
 */
async function handlePublishInstagramCarousel(
  token: string,
  igUserId: string,
  imageUrls: string[],
  caption: string
) {
  if (!imageUrls || imageUrls.length < 2) throw new Error("Carousel requires at least 2 imageUrls");
  if (imageUrls.length > 10) throw new Error("Carousel supports max 10 images");

  // Step 1: Create child containers
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const child = await graphPost(`/${igUserId}/media`, {
      image_url: url,
      is_carousel_item: true,
    }, token);
    if (!child.id) throw new Error(`Failed to create carousel child for ${url}`);
    childIds.push(child.id);
  }
  console.log(`[Meta] ${childIds.length} carousel children created`);

  // Step 2: Create carousel container
  const carousel = await graphPost(`/${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: caption || "",
  }, token);

  if (!carousel.id) throw new Error("Failed to create carousel container");

  // Step 3: Publish
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: carousel.id,
  }, token);

  return ok({
    mediaId: published.id,
    containerId: carousel.id,
    childCount: childIds.length,
    platform: "instagram",
    type: "carousel",
  });
}

/**
 * Publish a reel (video) to Instagram.
 * Two-step: create container with video → poll until ready → publish.
 */
async function handlePublishInstagramReel(
  token: string,
  igUserId: string,
  videoUrl: string,
  caption: string
) {
  if (!videoUrl) throw new Error("videoUrl is required");

  // Step 1: Create video container
  const container = await graphPost(`/${igUserId}/media`, {
    media_type: "REELS",
    video_url: videoUrl,
    caption: caption || "",
  }, token);

  if (!container.id) throw new Error("Failed to create reel container");
  console.log(`[Meta] Reel container created: ${container.id}, polling for readiness...`);

  // Step 2: Poll until video is ready (max 120s)
  const maxAttempts = 24;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await graphGet(`/${container.id}`, { fields: "status_code" }, token);
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") throw new Error("Reel processing failed");
    console.log(`[Meta] Reel poll ${i + 1}/${maxAttempts}: ${status.status_code}`);
  }

  // Step 3: Publish
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
  }, token);

  return ok({
    mediaId: published.id,
    containerId: container.id,
    platform: "instagram",
    type: "reel",
  });
}

/**
 * Create a Meta Ads campaign (always PAUSED for safety).
 */
async function handleCreateCampaign(
  token: string,
  adAccountId: string,
  campaignName: string,
  objective: string
) {
  const VALID_OBJECTIVES = [
    "OUTCOME_AWARENESS",
    "OUTCOME_ENGAGEMENT",
    "OUTCOME_LEADS",
    "OUTCOME_SALES",
    "OUTCOME_TRAFFIC",
    "OUTCOME_APP_PROMOTION",
  ];

  const safeObjective = VALID_OBJECTIVES.includes(objective) ? objective : "OUTCOME_SALES";

  const campaign = await graphPost(`/act_${adAccountId}/campaigns`, {
    name: campaignName || `DADZCO Launch — ${new Date().toISOString().slice(0, 10)}`,
    objective: safeObjective,
    status: "PAUSED",
    special_ad_categories: [],
  }, token);

  return ok({
    campaignId: campaign.id,
    name: campaignName,
    objective: safeObjective,
    status: "PAUSED",
    platform: "meta_ads",
  });
}

/**
 * Create an Ad Set within a campaign.
 */
async function handleCreateAdSet(
  token: string,
  adAccountId: string,
  body: RequestBody
) {
  if (!body.campaignId) throw new Error("campaignId is required");

  const dailyBudgetCents = Math.round((body.dailyBudget || 20) * 100);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const defaultTargeting = {
    geo_locations: { countries: ["CA"] },
    age_min: 28,
    age_max: 55,
    genders: [1, 2],
    publisher_platforms: ["facebook", "instagram"],
  };

  const adset = await graphPost(`/act_${adAccountId}/adsets`, {
    name: body.adSetName || `DADZCO AdSet — ${new Date().toISOString().slice(0, 10)}`,
    campaign_id: body.campaignId,
    daily_budget: dailyBudgetCents,
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: body.targeting || defaultTargeting,
    start_time: tomorrow.toISOString(),
    status: "PAUSED",
  }, token);

  return ok({
    adSetId: adset.id,
    campaignId: body.campaignId,
    dailyBudget: body.dailyBudget || 20,
    currency: "CAD",
    status: "PAUSED",
    platform: "meta_ads",
  });
}

/**
 * Create an Ad with creative within an Ad Set.
 */
async function handleCreateAd(
  token: string,
  adAccountId: string,
  body: RequestBody
) {
  if (!body.adSetId) throw new Error("adSetId is required");
  if (!body.adCreative) throw new Error("adCreative is required");

  const creative = body.adCreative;

  // Step 1: Create Ad Creative
  const creativePayload: Record<string, unknown> = {
    name: creative.name || `DADZCO Creative — ${new Date().toISOString().slice(0, 10)}`,
    object_story_spec: {
      link_data: {
        message: creative.body || "",
        link: creative.linkUrl || "https://dadzco.com",
        name: creative.headline || "DADZCO",
        call_to_action: {
          type: creative.callToAction || "SHOP_NOW",
        },
      },
    },
  };

  if (creative.imageUrl) {
    // Upload image to Meta from URL
    const imageUpload = await graphPost(`/act_${adAccountId}/adimages`, {
      url: creative.imageUrl,
    }, token);

    // Extract image hash from response
    const images = imageUpload.images || {};
    const imageHash = Object.values(images)[0]
      ? (Object.values(images)[0] as Record<string, string>).hash
      : null;

    if (imageHash) {
      (creativePayload.object_story_spec as Record<string, unknown>).link_data =
        { ...(creativePayload.object_story_spec as Record<string, Record<string, unknown>>).link_data, image_hash: imageHash };
    }
  }

  const adCreativeResult = await graphPost(`/act_${adAccountId}/adcreatives`, creativePayload, token);

  if (!adCreativeResult.id) throw new Error("Failed to create ad creative");

  // Step 2: Create Ad
  const ad = await graphPost(`/act_${adAccountId}/ads`, {
    name: creative.name || `DADZCO Ad — ${new Date().toISOString().slice(0, 10)}`,
    adset_id: body.adSetId,
    creative: { creative_id: adCreativeResult.id },
    status: "PAUSED",
  }, token);

  return ok({
    adId: ad.id,
    creativeId: adCreativeResult.id,
    adSetId: body.adSetId,
    status: "PAUSED",
    platform: "meta_ads",
  });
}

/**
 * Get performance insights for a campaign, ad set, or ad.
 */
async function handleGetInsights(
  token: string,
  objectId: string,
  datePreset: string
) {
  if (!objectId) throw new Error("objectId is required");

  const data = await graphGet(`/${objectId}/insights`, {
    fields: "impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type",
    date_preset: datePreset || "last_7d",
  }, token);

  return ok({ insights: data.data || [], objectId });
}

// ─── Main Handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { action } = body;

    if (!action) return fail("Missing 'action' parameter");

    // Load secrets
    const META_TOKEN = getEnvOrThrow("META_ACCESS_TOKEN");
    const META_IG_USER_ID = Deno.env.get("META_IG_USER_ID") || "";
    const META_AD_ACCOUNT_ID = Deno.env.get("META_AD_ACCOUNT_ID") || "";

    console.log(`[Meta] Action: ${action}`);

    let response: Response;

    switch (action) {
      // ── Token & Account Validation ──
      case "ping":
        if (!META_IG_USER_ID) return fail("META_IG_USER_ID not configured");
        response = await handlePing(META_TOKEN, META_IG_USER_ID);
        break;

      // ── Instagram Publishing ──
      case "publish_instagram_image":
        if (!META_IG_USER_ID) return fail("META_IG_USER_ID not configured");
        response = await handlePublishInstagramImage(
          META_TOKEN, META_IG_USER_ID, body.imageUrl || "", body.caption || ""
        );
        break;

      case "publish_instagram_carousel":
        if (!META_IG_USER_ID) return fail("META_IG_USER_ID not configured");
        response = await handlePublishInstagramCarousel(
          META_TOKEN, META_IG_USER_ID, body.imageUrls || [], body.caption || ""
        );
        break;

      case "publish_instagram_reel":
        if (!META_IG_USER_ID) return fail("META_IG_USER_ID not configured");
        response = await handlePublishInstagramReel(
          META_TOKEN, META_IG_USER_ID, body.videoUrl || "", body.caption || ""
        );
        break;

      // ── Meta Ads ──
      case "create_campaign":
        if (!META_AD_ACCOUNT_ID) return fail("META_AD_ACCOUNT_ID not configured");
        response = await handleCreateCampaign(
          META_TOKEN, META_AD_ACCOUNT_ID, body.campaignName || "", body.objective || "OUTCOME_SALES"
        );
        break;

      case "create_adset":
        if (!META_AD_ACCOUNT_ID) return fail("META_AD_ACCOUNT_ID not configured");
        response = await handleCreateAdSet(META_TOKEN, META_AD_ACCOUNT_ID, body);
        break;

      case "create_ad":
        if (!META_AD_ACCOUNT_ID) return fail("META_AD_ACCOUNT_ID not configured");
        response = await handleCreateAd(META_TOKEN, META_AD_ACCOUNT_ID, body);
        break;

      // ── Insights ──
      case "get_insights":
        response = await handleGetInsights(META_TOKEN, body.objectId || "", body.datePreset || "last_7d");
        break;

      default:
        return fail(`Unknown action: ${action}`);
    }

    await logAction(action, "success", { action });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[Meta] Error:", message);

    try {
      const body = await req.clone().json().catch(() => ({})) as Record<string, unknown>;
      await logAction(String(body.action || "unknown"), "error", { action: body.action }, message);
    } catch { /* ignore */ }

    return fail(message);
  }
});
