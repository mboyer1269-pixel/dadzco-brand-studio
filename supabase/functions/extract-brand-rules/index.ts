import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brandFileId, storagePath, fileName } = await req.json();
    if (!brandFileId || !storagePath) {
      return new Response(JSON.stringify({ error: "Missing brandFileId or storagePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("brand-book-files")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 in chunks to avoid stack overflow on large files
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

    // Build the AI request with tool calling for structured output
    const systemPrompt = `You are a brand identity expert. Analyze the uploaded brand book document or logo and extract structured brand rules.
Focus on:
- Visual identity rules (spacing, negative space, layout constraints)
- Color palette (extract exact colors with names and hex values)
- Typography rules (font families, weights, usage rules)
- Forbidden elements or keywords (things the brand should never do/use)
- Tone of voice guidelines
- Logo usage rules
Be thorough and specific. Extract real data from the document, not generic guidelines.`;

    // Both PDFs and images use image_url with data URI — the AI gateway handles both
    const aiPayload: any = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this brand document "${fileName}" and extract all brand rules, color palette, typography, and forbidden elements.`,
            },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_brand_rules",
            description: "Extract structured brand rules from a brand book document.",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "Main brand category detected (e.g. quiet_luxury, premium, minimalist, bold)",
                },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rule: { type: "string", description: "The brand rule" },
                      category: { type: "string", enum: ["visual", "tone", "layout", "logo", "general"] },
                      priority: { type: "string", enum: ["critical", "important", "nice_to_have"] },
                    },
                    required: ["rule", "category", "priority"],
                    additionalProperties: false,
                  },
                },
                palette: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      hex: { type: "string" },
                      usage: { type: "string" },
                    },
                    required: ["name", "hex"],
                    additionalProperties: false,
                  },
                },
                typography: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      font: { type: "string" },
                      weight: { type: "string" },
                      usage: { type: "string" },
                    },
                    required: ["font"],
                    additionalProperties: false,
                  },
                },
                forbidden_keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Words, styles, or elements the brand must never use",
                },
                summary: {
                  type: "string",
                  description: "A 2-3 sentence summary of the brand identity",
                },
              },
              required: ["category", "rules", "palette", "forbidden_keywords", "summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_brand_rules" } },
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
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "AI did not return structured rules" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Upsert into brand_rules
    // Delete old rules for this file first
    await adminClient.from("brand_rules").delete().eq("brand_file_id", brandFileId);

    const { error: insertError } = await adminClient.from("brand_rules").insert({
      user_id: user.id,
      brand_file_id: brandFileId,
      category: extracted.category || "general",
      rules: extracted.rules || [],
      palette: extracted.palette || [],
      forbidden_keywords: extracted.forbidden_keywords || [],
      typography: extracted.typography || [],
      raw_summary: extracted.summary || null,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save extracted rules" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-brand-rules error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
