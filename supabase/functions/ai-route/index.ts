import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

type Provider = "openai" | "anthropic";
type TaskType = "structured_task" | "brand_review";

interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RouteConfig {
  provider: Provider;
  model: string;
}

const ROUTES: Record<TaskType, RouteConfig> = {
  structured_task: {
    provider: "openai",
    model: "gpt-4.1",
  },
  brand_review: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function isTaskType(value: unknown): value is TaskType {
  return value === "structured_task" || value === "brand_review";
}

function isMessages(value: unknown): value is AiMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        ["system", "user", "assistant"].includes((message as AiMessage).role) &&
        typeof (message as AiMessage).content === "string" &&
        (message as AiMessage).content.trim().length > 0
    )
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: "Supabase environment not configured" }, 500);
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims?.sub || claims.role !== "authenticated") {
      return json({ error: "Unauthorized" }, 401);
    }

    const adminUserId = claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("ai-route admin role check failed", roleError);
      return json({ error: "Admin role check failed" }, 500);
    }

    if (!roleRow) {
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    const { taskType, messages, options = {} } = await req.json();
    if (!isTaskType(taskType)) {
      return json({ error: "Invalid taskType" }, 400);
    }
    if (!isMessages(messages)) {
      return json({ error: "Missing messages" }, 400);
    }

    if (taskType === "structured_task") {
      return await callOpenAI(ROUTES.structured_task, messages, options);
    }

    if (taskType === "brand_review") {
      return await callAnthropic(ROUTES.brand_review, messages, options);
    }

    return json({ error: "Invalid taskType" }, 400);
  } catch (error) {
    console.error("ai-route error", error);
    return json({ error: "Internal server error" }, 500);
  }
});

async function callOpenAI(
  route: RouteConfig,
  messages: AiMessage[],
  options: Record<string, unknown>
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: route.model,
      messages,
      temperature: typeof options.temperature === "number" ? options.temperature : 0.2,
      max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 2000,
      response_format: options.response_format,
    }),
  });

  if (!response.ok) {
    return json({ error: "OpenAI request failed", status: response.status }, 502);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content ?? "";

  return json({
    success: true,
    provider: "openai",
    model: route.model,
    result,
  });
}

async function callAnthropic(
  route: RouteConfig,
  messages: AiMessage[],
  options: Record<string, unknown>
) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const anthropicMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: route.model,
      messages: anthropicMessages,
      system: system || undefined,
      max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 2000,
      temperature: typeof options.temperature === "number" ? options.temperature : 0.2,
    }),
  });

  if (!response.ok) {
    return json({ error: "Anthropic request failed", status: response.status }, 502);
  }

  const data = await response.json();
  const result =
    data.content
      ?.filter((block: { type?: string }) => block.type === "text")
      .map((block: { text?: string }) => block.text ?? "")
      .join("") ?? "";

  return json({
    success: true,
    provider: "anthropic",
    model: route.model,
    result,
  });
}
