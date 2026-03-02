import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── BRAND DNA (mirrored from src/core/brand_dna.ts) ── */
const BRAND_DNA = {
  brand_name: "DADZCO | MUMZCO",
  positioning: "Parent-Child Narrative Luxury",
  core_theme: "Aviation & Wonders",
  pillars: ["Transmission", "Élévation", "Complicité", "Héritage"],
  palette_core: {
    noir_profond: "#1A1A1A",
    ivoire_chaud: "#F4F1EC",
    bronze_heritage: "#6E4B3A",
  },
  forbidden_elements: ["cartoon", "kawaii", "clipart", "rainbow overload", "glitter", "excessive pattern density"],
  financial_constraints: {
    minimum_margin_pct: 55,
    target_aov: 119,
    repeat_purchase_target_pct: 35,
    max_cac_ratio: 0.30,
  },
  visual_identity: { negative_space_minimum: 70 },
};

/* ── Supplier routing rules ── */
const SUPPLIER_RULES = {
  parent_categories: ["tee", "crewneck", "hoodie", "cap", "patch"],
  kid_aop_categories: ["kid_aop_set"],
  printful_print_types: ["DTG", "Embroidery"],
  kin_print_types: ["AOP"],
};

/* ── System prompt for the Round Table ── */
const ROUND_TABLE_SYSTEM = `You are the DADZCO Round Table — 7 expert agents working as ONE.

BRAND DNA (immutable):
- Brand: ${BRAND_DNA.brand_name}
- Theme: ${BRAND_DNA.core_theme}
- Pillars: ${BRAND_DNA.pillars.join(", ")}
- Palette: noir_profond (#1A1A1A), ivoire_chaud (#F4F1EC), bronze_heritage (#6E4B3A)
- Forbidden: ${BRAND_DNA.forbidden_elements.join(", ")}
- Min margin: ${BRAND_DNA.financial_constraints.minimum_margin_pct}%
- Target AOV: ${BRAND_DNA.financial_constraints.target_aov} CAD

SUPPLIER ROUTING (strict):
- Parent apparel (tee/crewneck/hoodie/cap/patch) → Printful ONLY → DTG or Embroidery
- Kid AOP sets (kid_aop_set) → Kin Custom ONLY → AOP (seamless pattern + panel mapping)
- NEVER route parent to Kin or kid AOP to Printful

PRICING RULES:
- All prices in CAD
- Every SKU margin >= 55% or collection FAILS finance gate
- Bundle discount: 15%
- Estimated costs: tee 12-15 CAD, crewneck 18-22 CAD, hoodie 22-28 CAD, cap 10-14 CAD, patch 3-5 CAD, kid_aop_set 20-28 CAD

AOP SPEC (Kin Custom only):
- Tile: 4500px seamless
- Density: generous negative space (>=70%)
- Panel mapping: front, back, sleeves, hood, collar
- Seam safety: keep key motifs away from seams
- Color limit: 3

AGENTS (each contributes):
1. Brand Strategy: positioning, why_now, market timing
2. Creative Director: visual direction, mythology
3. Artistic Designer: design prompts, negative prompts
4. POD Specialist: supplier routing, production specs
5. Storytelling: taglines, punchlines
6. Growth: marketing calendar (ONLY if finance gate passes)
7. Financial Gatekeeper: pricing, margins, gate pass/fail

OUTPUT: Respond ONLY with valid JSON matching the schema exactly. No markdown, no explanation.`;

/* ── Build user prompt ── */
function buildUserPrompt(idea: string, count: number, mode: string, theme?: string): string {
  return `Generate exactly ${count} complete launch-ready collections for DADZCO.

IDEA: "${idea}"
MODE: ${mode}
${theme ? `THEME OVERRIDE: ${theme}` : ""}

Each collection MUST have:
- 4-6 SKUs mixing parent + kid items
- At least 1 kid_aop_set per collection
- At least 1 bundle per collection
- Finance gate computed (pass or fail with reasons)
- Marketing calendar ONLY if finance_gate.passed === true
- Production-ready design prompts and negative prompts

JSON SCHEMA (follow EXACTLY):
{
  "run_meta": {
    "idea": "string",
    "timestamp": "ISO",
    "brand_theme": "${BRAND_DNA.core_theme}",
    "budget_monthly_cad": 300,
    "dna_version": "1.0",
    "rules_locked_required": true
  },
  "collections": [
    {
      "name": "string",
      "tagline": "string (max 10 words)",
      "theme": "string",
      "why_now": "string (1-2 lines)",
      "palette": ["noir_profond","ivoire_chaud","bronze_heritage"],
      "skus": [
        {
          "sku_name": "string",
          "audience": "parent" | "kid",
          "category": "tee" | "crewneck" | "hoodie" | "cap" | "patch" | "kid_aop_set",
          "provider": "printful" | "kin_custom",
          "print_type": "DTG" | "Embroidery" | "AOP",
          "design_direction": "string (clear & short)",
          "design_prompt": "string (production-ready)",
          "negative_prompt": "string",
          "aop_spec": null | {
            "tile_size_px": 4500,
            "repeat_type": "seamless",
            "density_rule": "generous_negative_space",
            "panel_mapping": ["front","back","sleeves","hood","collar"],
            "seam_safety": "keep key motifs away from seams",
            "color_limit": 3
          },
          "pricing": {
            "retail_cad": number,
            "estimated_cost_cad": number,
            "margin_pct": number,
            "bundle_eligible": boolean
          }
        }
      ],
      "bundles": [
        {
          "bundle_name": "string",
          "items": ["sku_name_1", "sku_name_2"],
          "discount_pct": 15,
          "bundle_price_cad": number,
          "bundle_margin_pct": number
        }
      ],
      "finance_gate": {
        "must_pass": true,
        "passed": boolean,
        "fail_reasons": [],
        "fixes_applied": [],
        "avg_margin_pct": number,
        "aov_target_cad": 155
      },
      "deliverables": {
        "printful_pack": {
          "included": true,
          "files": ["front.png","back.png","patch.png"],
          "spec": "4500x5400 PNG transparent 300DPI"
        },
        "kin_pack": {
          "included": boolean,
          "files": ["seamless_tile.png","panel_front.png","panel_back.png","panel_sleeves.png"],
          "spec": "4500x4500 seamless tile + panel templates"
        }
      },
      "marketing_calendar": null | {
        "week_1": "string",
        "week_2": "string",
        "week_3": "string",
        "week_4": "string"
      },
      "agent_notes": {
        "brand_strategy": "string",
        "creative_director": "string",
        "artistic_designer": "string",
        "pod_specialist": "string",
        "storytelling": "string",
        "growth": "string",
        "financial": "string"
      }
    }
  ]
}

CRITICAL RULES:
- provider MUST be "printful" for parent categories, "kin_custom" for kid_aop_set
- print_type MUST be "DTG" or "Embroidery" for printful, "AOP" for kin_custom
- aop_spec MUST be null for printful items, MUST be filled for kin_custom items
- marketing_calendar MUST be null if finance_gate.passed is false
- Every margin_pct MUST be >= 55
- Output ONLY the JSON. No markdown fences. No explanation.`;
}

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

/* ── Validate + enforce DNA constraints server-side ── */
function validateAndEnforce(data: Record<string, unknown>): Record<string, unknown> {
  const collections = data.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error("Missing or empty 'collections' array");
  }

  for (const col of collections) {
    const c = col as Record<string, unknown>;
    if (!c.name) c.name = "Untitled Collection";
    if (!c.tagline) c.tagline = "";
    if (!c.theme) c.theme = "";
    if (!Array.isArray(c.palette)) c.palette = ["noir_profond", "ivoire_chaud", "bronze_heritage"];
    (c.palette as string[]).splice(3);
    if (!Array.isArray(c.skus)) c.skus = [];
    (c.skus as unknown[]).splice(6);
    if (!c.agent_notes || typeof c.agent_notes !== "object") c.agent_notes = {};

    // Enforce supplier routing + margins
    const violations: string[] = [];
    const fixes: string[] = [];

    for (let skuIdx = 0; skuIdx < (c.skus as Record<string, unknown>[]).length; skuIdx++) {
      const sku = (c.skus as Record<string, unknown>[])[skuIdx];
      // Enforce SKU name
      if (!sku.sku_name || String(sku.sku_name).trim() === "") {
        sku.sku_name = `SKU-${skuIdx + 1}`;
        fixes.push(`Set default name for SKU index ${skuIdx}`);
      }
      // Enforce mockup_brief
      if (!sku.mockup_brief || String(sku.mockup_brief).trim() === "") {
        sku.mockup_brief = `Minimal premium design concept for ${sku.sku_name}. Aviation & Wonders DNA. No cartoons. 70% negative space.`;
        fixes.push(`Set default mockup_brief for ${sku.sku_name}`);
      }

      const pricing = sku.pricing as Record<string, unknown> | undefined;
      const audience = String(sku.audience || "");
      const category = String(sku.category || "");

      // Fix provider routing
      if (category === "kid_aop_set") {
        if (sku.provider !== "kin_custom") {
          fixes.push(`Fixed ${sku.sku_name}: routed to kin_custom`);
          sku.provider = "kin_custom";
          sku.print_type = "AOP";
        }
        if (!sku.aop_spec) {
          sku.aop_spec = {
            tile_size_px: 4500, repeat_type: "seamless",
            density_rule: "generous_negative_space",
            panel_mapping: ["front", "back", "sleeves", "hood", "collar"],
            seam_safety: "keep key motifs away from seams", color_limit: 3,
          };
          fixes.push(`Added default aop_spec for ${sku.sku_name}`);
        }
      } else if (SUPPLIER_RULES.parent_categories.includes(category)) {
        if (sku.provider !== "printful") {
          fixes.push(`Fixed ${sku.sku_name}: routed to printful`);
          sku.provider = "printful";
        }
        if (sku.print_type === "AOP") {
          sku.print_type = "DTG";
          fixes.push(`Fixed ${sku.sku_name}: changed AOP to DTG for printful`);
        }
        sku.aop_spec = null;
      }

      // Margin enforcement
      if (pricing && typeof pricing.margin_pct === "number") {
        if (pricing.margin_pct < BRAND_DNA.financial_constraints.minimum_margin_pct) {
          violations.push(`SKU "${sku.sku_name}" margin ${pricing.margin_pct}% < ${BRAND_DNA.financial_constraints.minimum_margin_pct}%`);
        }
      }

      // Forbidden elements in prompts
      const promptText = String(sku.design_prompt || "").toLowerCase();
      for (const forbidden of BRAND_DNA.forbidden_elements) {
        if (promptText.includes(forbidden.toLowerCase())) {
          violations.push(`SKU "${sku.sku_name}" prompt contains forbidden: "${forbidden}"`);
        }
      }
    }

    // Finance gate
    const skus = c.skus as Record<string, unknown>[];
    const margins = skus
      .map((s) => (s.pricing as Record<string, unknown>)?.margin_pct)
      .filter((m) => typeof m === "number") as number[];
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    const allAboveMin = margins.every((m) => m >= BRAND_DNA.financial_constraints.minimum_margin_pct);

    const financeGate = (c.finance_gate || {}) as Record<string, unknown>;
    financeGate.must_pass = true;
    financeGate.avg_margin_pct = Math.round(avgMargin * 10) / 10;
    financeGate.fixes_applied = fixes;

    if (!allAboveMin || violations.length > 0) {
      financeGate.passed = false;
      financeGate.fail_reasons = violations;
      c.marketing_calendar = null; // NO marketing if gate fails
      console.log("Finance gate FAILED for:", c.name, violations);
    } else {
      financeGate.passed = true;
      financeGate.fail_reasons = [];
    }
    c.finance_gate = financeGate;
  }

  return data;
}

/* ── CHAP (Brand Manager) prompt ── */
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const isPing = body.ping === true;
    const taskType = String(body.taskType || body.mode || "collection");

    // Health check
    if (isPing) {
      return new Response(JSON.stringify({ status: "ok", gateway: "ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isChap = taskType === "chap";

    if (isChap) {
      // CHAP mode — use flash model
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: CHAP_PROMPT },
            { role: "user", content: String(body.customInstructions || body.idea || "Quelles sont mes 3 meilleures actions stratégiques maintenant ?") },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("CHAP gateway error:", response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`CHAP gateway error: ${response.status}`);
      }

      const rawText = await response.text();
      const data = JSON.parse(rawText);
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(extractJSON(content));
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Collection generation mode ──
    const idea = String(body.idea || body.customInstructions || "Aviation & Wonders — drop de lancement");
    const count = Math.min(Number(body.count) || 3, 5);
    const mode = String(body.mode || "launch");
    const theme = body.theme ? String(body.theme) : undefined;

    console.log(`Round Table: generating ${count} collections, idea="${idea}", mode=${mode}`);

    const userPrompt = buildUserPrompt(idea, count, mode, theme);

    // Use GPT-5 for strategy+production, with Gemini Pro fallback
    let aiResponse: Response;
    let usedModel = "openai/gpt-5";
    let fallbackUsed = false;

    aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: ROUND_TABLE_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 12000,
        response_format: { type: "json_object" },
      }),
    });

    // Fallback to Gemini Pro if GPT-5 fails
    if (!aiResponse.ok && aiResponse.status !== 429) {
      console.log("GPT-5 failed, falling back to Gemini 2.5 Pro");
      fallbackUsed = true;
      usedModel = "google/gemini-2.5-pro";
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: ROUND_TABLE_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 12000,
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Réessayez dans quelques secondes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits insuffisants. Ajoutez des crédits dans Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const rawText = await aiResponse.text();
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

    // Validate + enforce DNA + supplier routing + finance gate
    try {
      parsed = validateAndEnforce(parsed);
    } catch (validationError) {
      console.error("Validation failed:", validationError);
      return new Response(JSON.stringify({
        error: "Schema validation failed", raw: JSON.stringify(parsed).slice(0, 800),
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Add run_meta if missing
    if (!parsed.run_meta) {
      parsed.run_meta = {
        idea,
        timestamp: new Date().toISOString(),
        brand_theme: BRAND_DNA.core_theme,
        budget_monthly_cad: 300,
        dna_version: "1.0",
        rules_locked_required: true,
        model_used: usedModel,
        fallback_used: fallbackUsed,
      };
    } else {
      (parsed.run_meta as Record<string, unknown>).model_used = usedModel;
      (parsed.run_meta as Record<string, unknown>).fallback_used = fallbackUsed;
    }

    console.log(`Round Table SUCCESS: ${(parsed.collections as unknown[]).length} collections, model=${usedModel}`);
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
