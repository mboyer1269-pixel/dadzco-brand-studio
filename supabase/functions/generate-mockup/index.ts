import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { prompt, skuName } = await req.json();
    if (!prompt) throw new Error("Missing prompt");

    console.log(`Mockup request for: ${skuName || "unknown"}`);

    const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");

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
        throw new Error(`Leonardo API error: ${createRes.status}`);
      }

      const createData = await createRes.json();
      const generationId = createData.sdGenerationJob?.generationId;
      if (!generationId) throw new Error("Failed to start Leonardo generation");

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
          throw new Error("Leonardo generation failed");
        }
        console.log(`Poll ${i + 1}/${maxAttempts}, status: ${status}`);
      }

      if (!imageUrl) throw new Error("Generation timed out after 90s");

      return new Response(
        JSON.stringify({ imageUrl, generationId, watermark: "CONCEPT ONLY" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stub mode: return placeholder with watermark
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
