import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_RULES = [
  { rule: "Matching ≠ identical", category: "general", priority: "critical" },
  { rule: "Parents wearable-alone", category: "visual", priority: "critical" },
  { rule: "Kids narrative", category: "tone", priority: "important" },
  { rule: "Anti-kitsch", category: "visual", priority: "critical" },
  { rule: "Margin>=55", category: "general", priority: "critical" },
];

const FALLBACK_FORBIDDEN = [
  "cartoon", "cute", "childish", "kawaii", "comic", "clipart", "mignon", "enfantin",
];

const FALLBACK_PALETTE = [
  { name: "Sable", hex: "#CBBFA9", usage: "primary" },
  { name: "Brume", hex: "#E7E4DE", usage: "secondary" },
  { name: "Navy", hex: "#0B1B2B", usage: "accent" },
  { name: "Crème", hex: "#F7F2E8", usage: "background" },
  { name: "Lavande", hex: "#C9C3D6", usage: "highlight" },
];

function ok200(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Everything wrapped — we NEVER return non-2xx
  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return ok200({ ok: false, reason: "LOVABLE_API_KEY not configured", fallbackUsed: false, details: null });
    }

    // Auth check
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return ok200({ ok: false, reason: "Unauthorized – sign in with email first", fallbackUsed: false, details: null });
    }

    const { brandFileId, storagePath, fileName } = await req.json();
    if (!brandFileId || !storagePath) {
      return ok200({ ok: false, reason: "Missing brandFileId or storagePath", fallbackUsed: false, details: null });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // --- Attempt AI extraction ---
    let extracted: Record<string, unknown> | null = null;
    let fallbackUsed = false;
    let reason = "";

    try {
      // Download file
      const { data: fileData, error: downloadError } = await adminClient.storage
        .from("brand-book-files")
        .download(storagePath);

      if (downloadError || !fileData) throw new Error(`Download failed: ${downloadError?.message}`);

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const CHUNK = 8192;
      let binary = "";
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);
      const isPdf = fileName?.toLowerCase().endsWith(".pdf");
      const mimeType = isPdf ? "application/pdf" : fileData.type || "image/png";

      const systemPrompt = `You are a brand identity expert. Analyze the uploaded brand book document or logo and extract structured brand rules.
Focus on: visual identity rules, color palette (hex), typography, forbidden elements, tone of voice, logo usage rules.
Be thorough and specific. Return valid JSON only.`;

      const aiPayload = {
        model: "google/gemini-2.5-flash",
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this brand document "${fileName}". Return JSON with keys: category (string), rules (array of {rule,category,priority}), palette (array of {name,hex,usage}), typography (array of {font,weight,usage}), forbidden_keywords (array of strings), summary (string).`,
              },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
      };

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiPayload),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI gateway ${aiResponse.status}: ${errText.slice(0, 200)}`);
      }

      const aiResult = await aiResponse.json();

      // Try tool_calls first, then message.content
      let rawJson: string | null = null;
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        rawJson = toolCall.function.arguments;
      } else {
        const content = aiResult.choices?.[0]?.message?.content || "";
        // Strip markdown fences if present
        rawJson = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      }

      if (!rawJson) throw new Error("AI returned empty content");

      extracted = JSON.parse(rawJson);
      if (!extracted || typeof extracted !== "object") throw new Error("AI returned non-object JSON");
    } catch (aiErr) {
      // AI extraction failed — use fallback
      fallbackUsed = true;
      reason = aiErr instanceof Error ? aiErr.message : "Unknown AI error";
      console.error("AI extraction failed, using fallback:", reason);
      extracted = {
        category: "general",
        rules: FALLBACK_RULES,
        palette: FALLBACK_PALETTE,
        typography: [],
        forbidden_keywords: FALLBACK_FORBIDDEN,
        summary: `Fallback rules applied. AI error: ${reason}`,
      };
    }

    // --- Merge strategy: upsert by user_id, preserve existing palette ---
    const { data: existingRow } = await adminClient
      .from("brand_rules")
      .select("palette, rules")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingPalette = existingRow?.palette;
    const hasExistingPalette = Array.isArray(existingPalette) && existingPalette.length > 0;

    // Deep-merge rules: keep existing + append new unique ones
    let mergedRules = extracted!.rules || FALLBACK_RULES;
    if (Array.isArray(existingRow?.rules) && existingRow.rules.length > 0) {
      const existingRuleTexts = new Set(
        (existingRow.rules as Array<{ rule: string }>).map((r) => r.rule)
      );
      const newRules = (mergedRules as Array<{ rule: string }>).filter(
        (r) => !existingRuleTexts.has(r.rule)
      );
      mergedRules = [...existingRow.rules, ...newRules];
    }

    const finalPalette = hasExistingPalette ? existingPalette : (extracted!.palette || FALLBACK_PALETTE);

    const rawSummary = fallbackUsed
      ? `fallbackUsed:true;${reason}`
      : (extracted!.summary as string) || null;

    const { error: upsertError } = await adminClient.from("brand_rules").upsert({
      user_id: user.id,
      brand_file_id: brandFileId,
      category: (extracted!.category as string) || "general",
      rules: mergedRules,
      palette: finalPalette,
      forbidden_keywords: extracted!.forbidden_keywords || FALLBACK_FORBIDDEN,
      typography: extracted!.typography || [],
      raw_summary: rawSummary,
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return ok200({
        ok: false,
        reason: `DB upsert failed: ${upsertError.message}`,
        fallbackUsed,
        details: null,
      });
    }

    return ok200({
      ok: !fallbackUsed,
      fallbackUsed,
      reason: fallbackUsed ? reason : undefined,
      saved: true,
      userId: user.id,
      brandFileId,
      extracted,
    });
  } catch (e) {
    // Absolute last-resort catch — still 200
    console.error("extract-brand-rules fatal:", e);
    return ok200({
      ok: false,
      reason: e instanceof Error ? e.message : "Unknown error",
      fallbackUsed: true,
      details: null,
    });
  }
});
