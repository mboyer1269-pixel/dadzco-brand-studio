import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Prompt for collection generation ── */
const COLLECTION_PROMPT = `Tu es le "Round Table" de DADZCO — un collectif de 7 agents experts.

FORMAT DE SORTIE (JSON strict) :
{
  "collections": [
    {
      "name": "Nom Collection",
      "theme": "Description du thème",
      "season": "Spring/Summer 2026",
      "palette": ["couleur1", "couleur2", "couleur3"],
      "concept_score": 82,
      "status": "concept",
      "thank_you_note": "Texte packaging",
      "agent_notes": {
        "brand_strategy": "...",
        "creative_director": "...",
        "artistic_designer": "...",
        "pod_specialist": "...",
        "storytelling": "...",
        "growth": "...",
        "financial": "..."
      },
      "skus": [
        {
          "name": "Nom SKU",
          "type": "quiet",
          "products": ["t-shirt", "crewneck", "hoodie"],
          "placement": "Description placement",
          "margin_target": 58.5,
          "mockup_brief": "Brief pour mockup",
          "adult_retail": 45,
          "kid_retail": 38,
          "bundle_price": 75
        }
      ]
    }
  ]
}

RÈGLES :
- Max 6 SKUs par collection, max 3 couleurs dans palette
- concept_score : 0-100 (évaluation qualité par le collectif)
- status : toujours "concept" en sortie
- Notes d'agents : 1-2 phrases max chacune
- Punchlines courtes. Descriptions concises.
- Réponds UNIQUEMENT avec le JSON valide.`;

/* ── Prompt for CHAP (Brand Manager) ── */
const CHAP_PROMPT = `Tu es CHAP, le Brand Manager IA de DADZCO.
Analyse l'état actuel de la marque et retourne exactement 3 actions stratégiques.

FORMAT DE SORTIE (JSON strict) :
{
  "moves": [
    { "action": "...", "reason": "...", "priority": "high" },
    { "action": "...", "reason": "...", "priority": "medium" },
    { "action": "...", "reason": "...", "priority": "low" }
  ]
}

- action : max 15 mots
- reason : max 25 mots
- priority : "high", "medium" ou "low"
- Réponds UNIQUEMENT avec le JSON valide.`;

/* ── Robust JSON extraction ── */
function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }
  return cleaned.substring(firstBrace, lastBrace + 1);
}

/* ── Validate collection schema ── */
function validateCollections(data: Record<string, unknown>): Record<string, unknown> {
  const collections = data.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error("Missing or empty 'collections' array");
  }
  for (const col of collections) {
    const c = col as Record<string, unknown>;
    if (!c.name) c.name = "Untitled Collection";
    if (!c.theme) c.theme = "";
    if (!Array.isArray(c.palette)) c.palette = [];
    (c.palette as string[]).splice(3); // max 3 colors
    if (!Array.isArray(c.skus)) c.skus = [];
    (c.skus as unknown[]).splice(6); // max 6 SKUs
    if (typeof c.concept_score !== "number") c.concept_score = 75;
    if (!c.status) c.status = "concept";
    if (!c.agent_notes || typeof c.agent_notes !== "object") c.agent_notes = {};
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let customInstructions = "";
    let isPing = false;
    let taskType = "collection"; // default
    try {
      const body = await req.json();
      customInstructions = body?.customInstructions || "";
      isPing = body?.ping === true;
      taskType = body?.taskType || "collection";
    } catch {
      // empty body is fine
    }

    // Health check
    if (isPing) {
      return new Response(JSON.stringify({ status: "ok", gateway: "ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt based on task type
    const isChap = taskType === "chap";
    const systemPrompt = isChap ? CHAP_PROMPT : COLLECTION_PROMPT;
    const userMessage = isChap
      ? (customInstructions || "Quelles sont mes 3 meilleures actions stratégiques maintenant ?")
      : customInstructions
        ? `Génère 1 collection complète pour DADZCO. Instructions : ${customInstructions}`
        : "Génère 1 collection complète pour DADZCO avec un thème créatif et varié.";

    console.log(`Round Table task: ${taskType}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: isChap ? 2000 : 8000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Réessayez dans quelques secondes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); } catch {
      console.error("Gateway response not JSON:", rawText.slice(0, 500));
      throw new Error("Gateway response was not valid JSON");
    }

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("AI returned empty content");

    let parsed;
    try {
      const jsonStr = extractJSON(content);
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI JSON:", content.slice(0, 500));
      return new Response(JSON.stringify({
        error: "Invalid JSON from AI", raw: content.slice(0, 800),
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate schema based on task type
    if (!isChap) {
      try {
        parsed = validateCollections(parsed);
      } catch (validationError) {
        console.error("Schema validation failed:", validationError);
        return new Response(JSON.stringify({
          error: "Schema validation failed", raw: JSON.stringify(parsed).slice(0, 800),
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    console.log(`Success! Task: ${taskType}`);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Round table error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
