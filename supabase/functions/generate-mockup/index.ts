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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { prompt, skuName, production, collectionId, skuId } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isProduction = production === true;
    console.log(`Mockup request for: ${skuName || "unknown"}, production: ${isProduction}`);

    const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");

    // Production mode REQUIRES Leonardo API key
    if (isProduction && !LEONARDO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Leonardo API key not configured. Production generation unavailable." }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let supabase: any = null;
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    }

    // FIX 6: Only create production_jobs for production=true
    let jobId: string | null = null;
    if (isProduction && supabase) {
      const { data: job } = await supabase
        .from("production_jobs")
        .insert({
          collection_id: collectionId || null,
          sku_id: skuId || skuName || null,
          provider: "leonardo",
          model_id: "aa77f04e-3eec-4034-9c07-d0f619684628",
          status: "started",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      jobId = job?.id || null;
    }

    // FIX 6: For preview, log to ai_generation_logs instead
    if (!isProduction && supabase) {
      await supabase.from("ai_generation_logs").insert({
        task_type: "mockup_preview",
        model_provider: LEONARDO_API_KEY ? "leonardo" : "stub",
        model_used: LEONARDO_API_KEY ? "leonardo-flux" : "placeholder",
        status: "success",
        collection_id: collectionId || null,
        metadata: { skuName, skuId, prompt: prompt.slice(0, 200) },
      });
    }

    // If Leonardo key is configured, use real generation
    if (LEONARDO_API_KEY) {
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
          width: 1024,
          height: 1024,
          num_images: 1,
          alchemy: true,
          photoReal: true,
          photoRealVersion: "v2",
          presetStyle: "CINEMATIC",
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Leonardo create error:", createRes.status, errText);

        if (supabase && jobId) {
          await supabase
            .from("production_jobs")
            .update({ status: "failed", error_message: errText, completed_at: new Date().toISOString() })
            .eq("id", jobId);
        }

        return new Response(
          JSON.stringify({ error: `Leonardo API error: ${createRes.status}`, details: errText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createData = await createRes.json();
      const generationId = createData.sdGenerationJob?.generationId;
      if (!generationId) {
        const msg = "Failed to start Leonardo generation";
        if (supabase && jobId) {
          await supabase.from("production_jobs").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
        }
        return new Response(JSON.stringify({ error: msg }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Generation started:", generationId);

      // Poll for completion (max 90s)
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
          if (supabase && jobId) {
            await supabase.from("production_jobs").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
          }
          return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log(`Poll ${i + 1}/${maxAttempts}, status: ${status}`);
      }

      if (!imageUrl) {
        const msg = "Generation timed out after 90s";
        if (supabase && jobId) {
          await supabase.from("production_jobs").update({ status: "timeout", error_message: msg, completed_at: new Date().toISOString() }).eq("id", jobId);
        }
        return new Response(JSON.stringify({ error: msg }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success
      if (supabase && jobId) {
        await supabase.from("production_jobs").update({
          status: "completed",
          image_url: imageUrl,
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);
      }

      return new Response(
        JSON.stringify({ imageUrl, generationId, watermark: isProduction ? null : "CONCEPT ONLY" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stub mode: return placeholder with watermark (only for non-production)
    console.log("No LEONARDO_API_KEY — returning stub placeholder");
    const placeholderUrl = `https://placehold.co/1024x1024/1a1a2e/ffffff?text=CONCEPT+ONLY%0A${encodeURIComponent(skuName || "SKU")}`;

    return new Response(
      JSON.stringify({ imageUrl: placeholderUrl, generationId: "stub", watermark: "CONCEPT ONLY" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Mockup generation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
