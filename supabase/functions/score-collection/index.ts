import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const SCORING_PROMPT = `Tu es le système de scoring DADZCO Brand OS V2. Analyse cette collection et retourne un score JSON strict.

CRITÈRES (chaque score de 0 à 100) :
1. adn_alignment — Cohérence avec l'ADN "Écho & Rire" (quiet luxury + funny premium)
2. anti_kitsch_compliance — Respect des interdits (pas de cartoon, pas de clipart, pas de childish)
3. market_differentiation — Originalité vs concurrence (pas de "Dad jokes" basiques)
4. viral_potential — Potentiel TikTok/Instagram (punchlines, storytelling fort)
5. pod_feasibility — Faisabilité technique POD (placements, formats, couleurs)
6. margin_strength — Solidité financière (marge ≥ 58.5%, pricing cohérent CAD)

PONDÉRATIONS pour le final_score :
- adn_alignment: 25%
- anti_kitsch_compliance: 20%
- margin_strength: 20%
- pod_feasibility: 15%
- market_differentiation: 10%
- viral_potential: 10%

Réponds UNIQUEMENT avec du JSON valide :
{
  "adn_alignment": number,
  "anti_kitsch_compliance": number,
  "market_differentiation": number,
  "viral_potential": number,
  "pod_feasibility": number,
  "margin_strength": number,
  "final_score": number,
  "notes": "Brief justification (2 phrases max)"
}`;

// ─── Auth Helper ────────────────────────────────────────────────────
async function authenticateRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error("Unauthorized");
  }

  return data.claims.sub as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminUserId = await authenticateRequest(req);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { collectionId, collectionData } = await req.json();

    if (!collectionId && !collectionData) {
      throw new Error("Missing collectionId or collectionData");
    }

    let collection: unknown = collectionData;
    if (collectionId && !collection) {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_items(*)")
        .eq("id", collectionId)
        .single();
      if (error) throw new Error(`Collection not found: ${error.message}`);
      collection = data;
    }

    // Fetch the latest locked Brand Book constraints for scoring context.
    const { data: brandRulesData } = await supabase
      .from("brand_rules")
      .select("palette, typography, rules, forbidden_keywords")
      .order("updated_at", { ascending: false })
      .limit(1);
    const brandConstraints = brandRulesData?.[0] || null;

    let brandContext = "";
    if (brandConstraints) {
      brandContext = `\n\nCONTRAINTES BRAND (source: Brand Book Hub verrouillé):\n- Palette: ${JSON.stringify(brandConstraints.palette)}\n- Typographie: ${JSON.stringify(brandConstraints.typography)}\n- Règles: ${JSON.stringify(brandConstraints.rules)}\n- Mots interdits: ${JSON.stringify(brandConstraints.forbidden_keywords)}\n\nUtilise ces contraintes pour évaluer adn_alignment et anti_kitsch_compliance.`;
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SCORING_PROMPT + brandContext },
          { role: "user", content: `Collection à scorer:\n${JSON.stringify(collection, null, 2)}` },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI scoring failed: ${res.status} ${t.slice(0, 200)}`);
    }

    const aiData = await res.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    let scores: Record<string, unknown>;
    try {
      scores = JSON.parse(content.trim());
    } catch {
      throw new Error("AI returned invalid JSON for scores");
    }

    if (collectionId) {
      await supabase.from("collection_scores").insert({
        collection_id: collectionId,
        adn_alignment: scores.adn_alignment,
        anti_kitsch_compliance: scores.anti_kitsch_compliance,
        market_differentiation: scores.market_differentiation,
        viral_potential: scores.viral_potential,
        pod_feasibility: scores.pod_feasibility,
        margin_strength: scores.margin_strength,
        final_score: scores.final_score,
        scored_by: "ai-gateway",
      });

      await supabase.from("collections").update({
        final_score: scores.final_score,
        adn_score: scores.adn_alignment,
      }).eq("id", collectionId);
    }

    return new Response(JSON.stringify(scores), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Scoring error:", e);
    const isAuth = e instanceof Error && e.message === "Unauthorized";
    if (isAuth) {
      return json({ error: "Unauthorized" }, 401);
    }

    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
