import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Task-to-Model Routing Table ────────────────────────────────────
type TaskType = "strategy" | "storytelling" | "mockup" | "production" | "scoring" | "general";

interface ModelConfig {
  model: string;
  provider: "lovable_gateway" | "leonardo";
  endpoint: string;
  estimatedCostPer1k: number; // placeholder cost per 1k tokens in USD
}

const MODEL_ROUTES: Record<TaskType, ModelConfig[]> = {
  strategy: [
    { model: "openai/gpt-5", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.03 },
    { model: "google/gemini-2.5-pro", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.01 },
  ],
  storytelling: [
    { model: "openai/gpt-5", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.03 },
    { model: "google/gemini-2.5-flash", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.005 },
  ],
  mockup: [
    { model: "google/gemini-3-flash-preview", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.002 },
    { model: "google/gemini-2.5-flash", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.005 },
  ],
  production: [
    { model: "leonardo-kino-xl", provider: "leonardo", endpoint: "https://cloud.leonardo.ai/api/rest/v1/generations", estimatedCostPer1k: 0.05 },
  ],
  scoring: [
    { model: "google/gemini-2.5-flash", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.005 },
    { model: "openai/gpt-5-mini", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.01 },
  ],
  general: [
    { model: "google/gemini-3-flash-preview", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.002 },
    { model: "google/gemini-2.5-flash", provider: "lovable_gateway", endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", estimatedCostPer1k: 0.005 },
  ],
};

// ─── Gateway Call with Fallback ─────────────────────────────────────
async function callGateway(
  config: ModelConfig,
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; max_tokens?: number; response_format?: unknown; tools?: unknown[]; tool_choice?: unknown } = {}
): Promise<{ content: string; usage: { input: number; output: number }; raw: unknown }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4000,
  };
  if (options.response_format) body.response_format = options.response_format;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Model ${config.model} failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const toolCalls = data.choices?.[0]?.message?.tool_calls;
  const usage = data.usage || {};

  return {
    content: toolCalls ? JSON.stringify(toolCalls) : content,
    usage: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 },
    raw: data,
  };
}

// ─── Route with Fallback ────────────────────────────────────────────
async function routeTask(
  taskType: TaskType,
  messages: Array<{ role: string; content: string }>,
  options: Record<string, unknown> = {}
): Promise<{ content: string; modelUsed: string; provider: string; fallbackUsed: boolean; fallbackFrom: string | null; usage: { input: number; output: number }; estimatedCost: number; durationMs: number }> {
  const routes = MODEL_ROUTES[taskType] || MODEL_ROUTES.general;
  let lastError: Error | null = null;
  let fallbackFrom: string | null = null;

  for (let i = 0; i < routes.length; i++) {
    const config = routes[i];
    if (config.provider === "leonardo") {
      // Leonardo has its own pipeline — skip gateway calls
      throw new Error("Production mode requires Leonardo pipeline. Use generate-mockup function directly.");
    }

    const start = Date.now();
    try {
      console.log(`[AI Gateway] Trying ${config.model} for task: ${taskType}`);
      const result = await callGateway(config, messages, options);
      const durationMs = Date.now() - start;
      const totalTokens = result.usage.input + result.usage.output;
      const estimatedCost = (totalTokens / 1000) * config.estimatedCostPer1k;

      return {
        content: result.content,
        modelUsed: config.model,
        provider: config.provider,
        fallbackUsed: i > 0,
        fallbackFrom,
        usage: result.usage,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000,
        durationMs,
      };
    } catch (err) {
      console.error(`[AI Gateway] ${config.model} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
      fallbackFrom = config.model;
    }
  }

  throw lastError || new Error(`No model available for task type: ${taskType}`);
}

// ─── Log Generation ─────────────────────────────────────────────────
async function logGeneration(result: {
  taskType: string;
  modelUsed: string;
  provider: string;
  fallbackUsed: boolean;
  fallbackFrom: string | null;
  usage: { input: number; output: number };
  estimatedCost: number;
  durationMs: number;
  status: string;
  errorMessage?: string;
  collectionId?: string;
  designId?: string;
  userId?: string;
}) {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await supabase.from("ai_generation_logs").insert({
      task_type: result.taskType,
      model_used: result.modelUsed,
      model_provider: result.provider,
      fallback_used: result.fallbackUsed,
      fallback_from: result.fallbackFrom,
      input_tokens: result.usage.input,
      output_tokens: result.usage.output,
      estimated_cost: result.estimatedCost,
      duration_ms: result.durationMs,
      status: result.status,
      error_message: result.errorMessage,
      collection_id: result.collectionId || null,
      design_id: result.designId || null,
      user_id: result.userId || null,
    });
  } catch (logErr) {
    console.error("[AI Gateway] Failed to log generation:", logErr);
  }
}

// ─── Main Handler ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskType, messages, options, collectionId, designId, userId } = await req.json();

    if (!taskType || !messages?.length) {
      throw new Error("Missing taskType or messages");
    }

    const validTypes: TaskType[] = ["strategy", "storytelling", "mockup", "production", "scoring", "general"];
    if (!validTypes.includes(taskType)) {
      throw new Error(`Invalid taskType: ${taskType}. Valid: ${validTypes.join(", ")}`);
    }

    // Production mode redirects to Leonardo pipeline
    if (taskType === "production") {
      return new Response(
        JSON.stringify({
          error: "Production mode requires the generate-mockup endpoint with Leonardo. Use that function directly.",
          redirect: "generate-mockup",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await routeTask(taskType as TaskType, messages, options || {});

    // Log async — don't block response
    logGeneration({
      taskType,
      modelUsed: result.modelUsed,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      fallbackFrom: result.fallbackFrom,
      usage: result.usage,
      estimatedCost: result.estimatedCost,
      durationMs: result.durationMs,
      status: "success",
      collectionId,
      designId,
      userId,
    });

    return new Response(
      JSON.stringify({
        content: result.content,
        model: result.modelUsed,
        provider: result.provider,
        fallback: result.fallbackUsed,
        fallbackFrom: result.fallbackFrom,
        usage: result.usage,
        estimatedCost: result.estimatedCost,
        durationMs: result.durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[AI Gateway] Error:", e);

    // Try to log failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      logGeneration({
        taskType: body.taskType || "unknown",
        modelUsed: "none",
        provider: "none",
        fallbackUsed: false,
        fallbackFrom: null,
        usage: { input: 0, output: 0 },
        estimatedCost: 0,
        durationMs: 0,
        status: "error",
        errorMessage: e instanceof Error ? e.message : "Unknown",
        collectionId: body.collectionId,
        designId: body.designId,
        userId: body.userId,
      });
    } catch { /* ignore */ }

    const status = e instanceof Error && e.message.includes("Rate limit") ? 429 : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
