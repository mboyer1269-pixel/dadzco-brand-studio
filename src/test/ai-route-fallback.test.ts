import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/ai-route/index.ts"),
  "utf8"
);

const roundTable = readFileSync(
  resolve(process.cwd(), "supabase/functions/round-table/index.ts"),
  "utf8"
);

const envExample = readFileSync(
  resolve(process.cwd(), "supabase/functions/.env.example"),
  "utf8"
);

describe("ai-route structured_task fallback", () => {
  it("keeps OpenAI as primary and Gemini as the structured_task fallback", () => {
    expect(source).toContain("return await runStructuredTask(messages, options)");
    expect(source).toContain("const primary = ROUTES.structured_task;");
    expect(source).toMatch(
      /STRUCTURED_TASK_FALLBACK: RouteConfig = \{\s+provider: "gemini",\s+model: "gemini-2\.5-pro",/
    );

    const primaryCall = source.indexOf("await callOpenAI(primary, messages, options)");
    const fallbackCall = source.indexOf("await callGemini(fallback, messages, options)");
    expect(primaryCall).toBeGreaterThan(-1);
    expect(fallbackCall).toBeGreaterThan(primaryCall);
  });

  it("falls back on every failure except a 400", () => {
    expect(source).toContain("return !outcome.ok && outcome.status !== 400;");
    expect(source).toContain("if (!shouldFallback(primaryOutcome))");

    const guard = source.indexOf("if (!shouldFallback(primaryOutcome))");
    const fallbackCall = source.indexOf("await callGemini(fallback, messages, options)");
    expect(guard).toBeLessThan(fallbackCall);
  });

  it("treats timeouts, network errors and missing keys as fallback-eligible", () => {
    expect(source).toContain("signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)");
    expect(source).toContain("const PROVIDER_TIMEOUT_MS = 60_000;");
    expect(source).toContain('return networkFailure("openai", error);');
    // Missing key / timeout / network outcomes carry status null, so shouldFallback is true.
    expect(source).toContain(
      'return { ok: false, status: null, reason: "OPENAI_API_KEY not configured" };'
    );
    expect(source).toMatch(/function networkFailure[\s\S]*?status: null,/);
  });

  it("uses the direct Gemini API with a server-only key, never the Lovable gateway", () => {
    expect(source).toContain('Deno.env.get("GEMINI_API_KEY")');
    expect(source).toContain(
      '"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"'
    );
    expect(source).not.toContain("ai.gateway.lovable.dev");
    expect(source).not.toContain("LOVABLE_API_KEY");
    expect(source).not.toContain("VITE_GEMINI");
    expect(envExample).toContain("GEMINI_API_KEY=");
  });

  it("reports fallback usage in the response contract", () => {
    expect(source).toContain("fallback_used: false,");
    expect(source).toContain("fallback_used: true,");
    expect(source).toContain("fallback_from: primary.provider,");
    expect(source).toContain('error: "All providers failed for structured_task"');
    // The primary status is preserved so round-table keeps its 429 / 402 handling.
    expect(source).toContain("status: primaryOutcome.status,");
  });

  it("does not wrap brand_review in the fallback", () => {
    expect(source).toContain("return await callAnthropic(ROUTES.brand_review, messages, options)");
    const anthropicFn = source.slice(source.indexOf("async function callAnthropic"));
    expect(anthropicFn).not.toContain("callGemini");
  });

  it("round-table reads fallback_used from ai-route instead of hardcoding it", () => {
    expect(roundTable).toContain("const fallbackUsed = aiRouteData.fallback_used === true;");
    expect(roundTable).not.toContain("const fallbackUsed = false;");
  });
});
