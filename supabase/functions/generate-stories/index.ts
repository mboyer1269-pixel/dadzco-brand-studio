import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { skus, collectionName, collectionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es le directeur créatif de DADZCO, une marque premium de vêtements pour pères modernes. 
Mythologie de marque : "Écho & Rire" — chaque design capture l'écho silencieux de l'élégance paternelle et le rire complice de la famille.

Pour chaque SKU, génère :
1. mythology: Un paragraphe narratif (3-4 phrases) ancré dans la mythologie "Écho & Rire"
2. punchlines: 3 punchlines marketing courtes et percutantes
3. shopify_description: Description produit Shopify (150 mots max, SEO-friendly, en anglais)
4. tiktok_caption: Caption TikTok engageante (avec hashtags, en anglais)
5. instagram_caption: Caption Instagram premium (avec hashtags, en anglais)
6. hero_image_brief: Brief créatif pour image hero (50 mots, en anglais)

Ton : ultra-premium, jamais kitsch, humour intelligent pour les "Funny" SKUs, minimalisme raffiné pour les "Quiet" SKUs.`;

    const userPrompt = `Collection: "${collectionName}" (${collectionType})
    
SKUs à traiter:
${skus.map((s: any, i: number) => `${i + 1}. "${s.name}" (type: ${s.type}, style: ${s.style})`).join("\n")}

Réponds avec un JSON array. Chaque élément contient: name, mythology, punchlines (array), shopify_description, tiktok_caption, instagram_caption, hero_image_brief.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_stories",
              description: "Return generated stories for each SKU",
              parameters: {
                type: "object",
                properties: {
                  stories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        mythology: { type: "string" },
                        punchlines: { type: "array", items: { type: "string" } },
                        shopify_description: { type: "string" },
                        tiktok_caption: { type: "string" },
                        instagram_caption: { type: "string" },
                        hero_image_brief: { type: "string" },
                      },
                      required: ["name", "mythology", "punchlines", "shopify_description", "tiktok_caption", "instagram_caption", "hero_image_brief"],
                    },
                  },
                },
                required: ["stories"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_stories" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let stories = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      stories = parsed.stories;
    }

    return new Response(JSON.stringify({ stories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-stories error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
