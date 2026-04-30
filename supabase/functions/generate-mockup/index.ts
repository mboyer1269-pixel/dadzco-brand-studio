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
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    const { prompt, skuName, production, collectionId, skuId, margin_pct, negative_space_pct } = await req.json();

    const isProduction = production === true;

    // ── Preview mode: ALWAYS return 200 ──
    if (!isProduction) {
      const safePrompt = (prompt || "").trim();
      const safeName = skuName || "SKU";
      const placeholderUrl = `https://placehold.co/1024x1024/1a1a2e/ffffff?text=CONCEPT+ONLY%0A${encodeURIComponent(safeName)}`;

      await supabase.from("ai_generation_logs").insert({
        task_type: "mockup_preview",
        model_provider: "stub",
        model_used: "placeholder",
        status: "success",
        collection_id: collectionId || null,
        metadata: { skuName: safeName, skuId, prompt: safePrompt.slice(0, 200) },
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "preview",
          imageUrl: placeholderUrl,
          generationId: "stub",
          watermark: "CONCEPT ONLY",
          error: safePrompt ? null : "Missing prompt (preview fallback)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Production mode ──

    // DNA enforcement
    const DNA_FORBIDDEN = ["cartoon", "kawaii", "clipart", "rainbow overload", "glitter", "excessive pattern density"];
    const DNA_MIN_MARGIN = 55;
    const DNA_MIN_SPACE = 70;
    const dnaViolations: string[] = [];
    const promptLower = (prompt || "").toLowerCase();
    for (const f of DNA_FORBIDDEN) {
      if (promptLower.includes(f.toLowerCase())) dnaViolations.push(`Forbidden: "${f}"`);
    }
    if (margin_pct !== undefined && margin_pct < DNA_MIN_MARGIN) {
      dnaViolations.push(`Margin ${margin_pct}% < ${DNA_MIN_MARGIN}%`);
    }
    if (negative_space_pct !== undefined && negative_space_pct < DNA_MIN_SPACE) {
      dnaViolations.push(`Negative space ${negative_space_pct}% < ${DNA_MIN_SPACE}%`);
    }
    if (dnaViolations.length > 0) {
      console.log("DNA BLOCKED mockup:", dnaViolations);
      return new Response(JSON.stringify({
        ok: false,
        mode: "production",
        status: "blocked_by_dna",
        message: "DNA BLOCKED: " + dnaViolations.join(" | "),
        violated_rules: dnaViolations,
        imageUrl: null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!prompt) {
      return new Response(JSON.stringify({
        ok: false, mode: "production", error: "Missing prompt", imageUrl: null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");

    if (!LEONARDO_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, mode: "production", error: "Leonardo key not configured", imageUrl: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Mockup request: ${skuName || "unknown"}, production=true`);

    // ── Production path: Leonardo ──
    let jobId: string | null = null;
    const { data: job } = await supabase.from("production_jobs").insert({
      collection_id: collectionId || null,
      sku_id: skuId || skuName || null,
      provider: "leonardo",
      model_id: "aa77f04e-3eec-4034-9c07-d0f619684628",
      status: "started",
      started_at: new Date().toISOString(),
    }).select("id").single();
    jobId = job?.id || null;

    const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest/v1";
    const fullPrompt = `Professional apparel product mockup, clean white background, premium quality photo. ${prompt}. Studio lighting, e-commerce ready, high resolution, no text overlays.`;

    const createRes = await fetch(`${LEONARDO_BASE}/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LEONARDO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        modelId: "aa77f04e-3eec-4034-9c07-d0f619684628",
        width: 1024, height: 1024, num_images: 1,
        alchemy: true, photoReal: true, photoRealVersion: "v2", presetStyle: "CINEMATIC",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Leonardo create error:", createRes.status, errText);
      if (jobId) {
        await supabase.from("production_jobs")
          .update({ status: "failed", error_message: errText, completed_at: new Date().toISOString() })
          .eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ ok: false, mode: "production", error: `Leonardo API error: ${createRes.status}`, imageUrl: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createData = await createRes.json();
    const generationId = createData.sdGenerationJob?.generationId;
    if (!generationId) {
      const msg = "Failed to start Leonardo generation";
      if (jobId) {
        await supabase.from("production_jobs").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(JSON.stringify({ ok: false, mode: "production", error: msg, imageUrl: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generation started:", generationId);
    let imageUrl: string | null = null;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`${LEONARDO_BASE}/generations/${generationId}`, {
        headers: { Authorization: `Bearer ${LEONARDO_API_KEY}`, Accept: "application/json" },
      });
      if (!pollRes.ok) { await pollRes.text(); continue; }

      const pollData = await pollRes.json();
      const status = pollData.generations_by_pk?.status;
      if (status === "COMPLETE") {
        const images = pollData.generations_by_pk?.generated_images;
        if (images?.length > 0) imageUrl = images[0].url;
        break;
      } else if (status === "FAILED") {
        const msg = "Leonardo generation failed";
        if (jobId) {
          await supabase.from("production_jobs").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
        }
        return new Response(JSON.stringify({ ok: false, mode: "production", error: msg, imageUrl: null }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Poll ${i + 1}/${maxAttempts}, status: ${status}`);
    }

    if (!imageUrl) {
      const msg = "Generation timed out after 90s";
      if (jobId) {
        await supabase.from("production_jobs").update({ status: "timeout", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(JSON.stringify({ ok: false, mode: "production", error: msg, imageUrl: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (jobId) {
      await supabase.from("production_jobs").update({
        status: "completed", image_url: imageUrl, completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ ok: true, mode: "production", imageUrl, generationId, watermark: null, error: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Mockup generation error:", e);
    return new Response(
      JSON.stringify({ ok: false, mode: "unknown", error: e instanceof Error ? e.message : "Unknown error", imageUrl: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
