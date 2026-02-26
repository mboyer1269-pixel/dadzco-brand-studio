import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es le "Round Table" de DADZCO — un collectif de 7 agents experts qui collaborent pour créer des collections complètes de vêtements premium.

Les 7 agents :
1. **Brand Strategy Specialist** — Positionnement marque, cohérence ADN "Écho & Rire"
2. **Creative & Mythology Director** — Thèmes, mythologie, univers narratif
3. **Artistic Designer** — Direction artistique, palettes, typographies, placements graphiques
4. **POD Specialist** — Faisabilité technique print-on-demand, placements (large patch bas hoodie/crewneck, petite version tees), formats fichiers
5. **Storytelling Grok** — Mythologie "Écho & Rire", punchlines élégantes, descriptions Shopify, captions TikTok/Instagram
6. **Growth & Conversion Strategist** — Stratégie pricing, bundles, upsells, conversion
7. **Financial Gatekeeper** — Validation marges (cible 58.5%), buffer 12% retours, pricing réel CAD

RÈGLES STRICTES :
- Chaque collection = 7 SKUs : 4 Quiet Luxury (minimaliste, géométrique, ton-sur-ton) + 3 Funny Premium (humour élégant, typographie witty)
- Produits : T-shirt, Crewneck, Hoodie — versions Adult + Kid matching
- Placements : Large patch bas pour hoodie/crewneck, petite version pour tees
- Thank you note packaging inclus par collection
- Prix en CAD, marge réelle 58.5%, buffer 12%, perso +15 CAD
- Bundle pricing : Adult + Kid = -10%
- Storytelling par SKU : mythologie courte, 3 punchlines, description Shopify, caption TikTok, caption Instagram, brief image hero
- Chaque agent signe sa contribution

FORMAT DE SORTIE (JSON strict) :
{
  "collections": [
    {
      "name": "Nom Collection",
      "theme": "Description du thème",
      "season": "Spring/Summer 2026",
      "palette": ["couleur1", "couleur2", "couleur3"],
      "thank_you_note": "Texte du thank you note packaging",
      "agent_notes": {
        "brand_strategy": "Note du Brand Strategy Specialist",
        "creative_director": "Note du Creative & Mythology Director",
        "artistic_designer": "Note de l'Artistic Designer",
        "pod_specialist": "Note du POD Specialist",
        "storytelling": "Note du Storytelling Grok",
        "growth": "Note du Growth & Conversion Strategist",
        "financial": "Note du Financial Gatekeeper"
      },
      "skus": [
        {
          "name": "Nom du SKU",
          "type": "quiet",
          "products": ["t-shirt", "crewneck", "hoodie"],
          "placement": "Description du placement graphique",
          "adult_base_cost": 18,
          "kid_base_cost": 14,
          "adult_retail": 45,
          "kid_retail": 38,
          "bundle_price": 75,
          "bundle_with_perso": 90,
          "margin_pct": 58.5,
          "mockup_brief": "Brief détaillé pour le mock-up",
          "story": {
            "mythology": "Mythologie Écho & Rire (2-3 phrases)",
            "punchlines": ["punchline 1", "punchline 2", "punchline 3"],
            "shopify_description": "Description Shopify complète",
            "tiktok_caption": "Caption TikTok avec hashtags",
            "instagram_caption": "Caption Instagram avec hashtags",
            "hero_image_brief": "Brief pour image hero"
          }
        }
      ]
    }
  ]
}

Génère EXACTEMENT 3 collections. Chaque collection a EXACTEMENT 7 SKUs (4 quiet + 3 funny).
Tous les prix sont en CAD. Les marges doivent être validées par le Financial Gatekeeper.
Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après, sans blocs markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let customInstructions = "";
    try {
      const body = await req.json();
      customInstructions = body?.customInstructions || "";
    } catch {
      // empty body is fine
    }

    const userMessage = customInstructions
      ? `Génère 3 collections complètes pour DADZCO. Instructions additionnelles : ${customInstructions}`
      : "Génère 3 collections complètes pour DADZCO avec des thèmes variés et créatifs. Mélange les univers : un thème nature/organique, un thème urbain/moderne, un thème héritage/classique.";

    console.log("Calling AI gateway with gemini-2.5-pro...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 16000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Réessayez dans quelques secondes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} — ${errText.slice(0, 200)}`);
    }

    const rawText = await response.text();
    console.log("AI response length:", rawText.length);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse gateway response:", rawText.slice(0, 500));
      throw new Error("Gateway response was not valid JSON");
    }

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.error("Empty content from AI. Full response:", JSON.stringify(data).slice(0, 1000));
      throw new Error("AI returned empty content");
    }

    console.log("AI content length:", content.length);

    // Extract JSON — handle possible markdown wrapping
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI content as JSON:", jsonStr.slice(0, 500));
      return new Response(JSON.stringify({ 
        error: "La réponse IA n'était pas du JSON valide. Réessayez.",
        raw_preview: jsonStr.slice(0, 500),
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Success! Collections:", parsed.collections?.length || 0);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Round table error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
