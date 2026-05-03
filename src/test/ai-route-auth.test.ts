import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionPath = resolve(process.cwd(), "supabase/functions/ai-route/index.ts");
const source = existsSync(functionPath) ? readFileSync(functionPath, "utf8") : "";
const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");

describe("ai-route Edge Function", () => {
  it("exists and enables platform JWT verification", () => {
    expect(existsSync(functionPath)).toBe(true);
    expect(config).toMatch(/\[functions\.ai-route\]\s+verify_jwt = true/);
  });

  it("requires verified admin auth before parsing body or provider secrets", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain('return json({ error: "Unauthorized" }, 401)');
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain(".auth.getClaims");
    expect(source).toContain('.from("user_roles")');
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain(
      'return json({ error: "Forbidden — admin role required" }, 403)'
    );

    const authIndex = source.indexOf('req.headers.get("Authorization")');
    const roleIndex = source.indexOf('.eq("role", "admin")');
    const bodyIndex = source.indexOf("await req.json()");
    const openAiKeyIndex = source.indexOf('Deno.env.get("OPENAI_API_KEY")');
    const anthropicKeyIndex = source.indexOf('Deno.env.get("ANTHROPIC_API_KEY")');
    const openAiFetchIndex = source.indexOf('fetch("https://api.openai.com/v1/');
    const anthropicFetchIndex = source.indexOf('fetch("https://api.anthropic.com/v1/');

    expect(authIndex).toBeGreaterThan(-1);
    expect(roleIndex).toBeGreaterThan(authIndex);
    expect(authIndex).toBeLessThan(bodyIndex);
    expect(roleIndex).toBeLessThan(bodyIndex);
    expect(roleIndex).toBeLessThan(openAiKeyIndex);
    expect(roleIndex).toBeLessThan(anthropicKeyIndex);
    expect(roleIndex).toBeLessThan(openAiFetchIndex);
    expect(roleIndex).toBeLessThan(anthropicFetchIndex);
  });

  it("routes only documented task types to documented providers and models", () => {
    expect(source).toContain('taskType === "structured_task"');
    expect(source).toContain('taskType === "brand_review"');
    expect(source).toContain('model: "gpt-4.1"');
    expect(source).toContain('model: "claude-sonnet-4-6"');
    expect(source).not.toContain("claude-sonnet-4-20250514");
    expect(source).toContain('provider: "openai"');
    expect(source).toContain('provider: "anthropic"');
    expect(source).toContain('return json({ error: "Invalid taskType" }, 400)');
    expect(source).not.toContain("ai.gateway.lovable.dev");
    expect(source).not.toContain("LOVABLE_API_KEY");
  });

  it("handles HTTP methods, role lookup failures, and internal errors safely", () => {
    expect(source).toContain('"Access-Control-Allow-Methods": "POST, OPTIONS"');
    expect(source).toContain('if (req.method === "OPTIONS")');
    expect(source).toContain('if (req.method !== "POST")');
    expect(source).toContain('return json({ error: "Method not allowed" }, 405)');

    expect(source).toContain("error: roleError");
    expect(source).toContain('return json({ error: "Admin role check failed" }, 500)');
    expect(source).toContain("console.error");
    expect(source).toContain('return json({ error: "Internal server error" }, 500)');
    expect(source).not.toContain("error instanceof Error ? error.message");
    expect(source).not.toContain('"Unknown error"');
  });
});
