import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");
    if (!LEONARDO_API_KEY) throw new Error("LEONARDO_API_KEY is not configured");

    const { prompt, skuName } = await req.json();
    if (!prompt) throw new Error("Missing prompt");

    const fullPrompt = `Professional apparel product mockup, clean white background, premium quality photo. ${prompt}. Studio lighting, e-commerce ready, high resolution, no text overlays.`;

    console.log(`Generating mockup for: ${skuName || "unknown"}`);

    // Step 1: Create generation
    const createRes = await fetch(`${LEONARDO_BASE}/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LEONARDO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        modelId: "aa77f04e-3eec-4034-9c07-d0f619684628", // Leonardo Kino XL
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
    if (!generationId) {
      console.error("No generation ID:", JSON.stringify(createData));
      throw new Error("Failed to start Leonardo generation");
    }

    console.log("Generation started:", generationId);

    // Step 2: Poll for completion (max 90s)
    let imageUrl: string | null = null;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const pollRes = await fetch(`${LEONARDO_BASE}/generations/${generationId}`, {
        headers: {
          Authorization: `Bearer ${LEONARDO_API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!pollRes.ok) {
        const t = await pollRes.text();
        console.error("Poll error:", pollRes.status, t);
        continue;
      }

      const pollData = await pollRes.json();
      const status = pollData.generations_by_pk?.status;

      if (status === "COMPLETE") {
        const images = pollData.generations_by_pk?.generated_images;
        if (images?.length > 0) {
          imageUrl = images[0].url;
        }
        break;
      } else if (status === "FAILED") {
        throw new Error("Leonardo generation failed");
      }

      console.log(`Poll attempt ${i + 1}/${maxAttempts}, status: ${status}`);
    }

    if (!imageUrl) {
      throw new Error("Generation timed out after 90s");
    }

    console.log("Mockup generated successfully:", imageUrl);

    return new Response(JSON.stringify({ imageUrl, generationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Mockup generation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
