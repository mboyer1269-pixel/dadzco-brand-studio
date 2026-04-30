import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-mockup/index.ts"),
  "utf8"
);

describe("generate-mockup Edge Function auth guard", () => {
  it("requires verified admin auth before provider calls or service-role writes", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain('return json({ error: "Unauthorized" }, 401)');
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain(".auth.getClaims");
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain('return json({ error: "Forbidden — admin role required" }, 403)');
    expect(source).not.toContain("userId } = await req.json()");

    const authIndex = source.indexOf('req.headers.get("Authorization")');
    expect(authIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeLessThan(source.indexOf('Deno.env.get("LEONARDO_API_KEY")'));
    expect(authIndex).toBeLessThan(source.indexOf('from("ai_generation_logs").insert'));
    expect(authIndex).toBeLessThan(source.indexOf('from("production_jobs").insert'));
  });
});
