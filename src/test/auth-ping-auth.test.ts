import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/auth-ping/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("auth-ping auth hardening", () => {
  it("enables platform JWT verification only for auth-ping", () => {
    expect(config).toMatch(/\[functions\.auth-ping\]\s+verify_jwt = true/);
    expect(config).toMatch(/\[functions\.check-gates\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.create-export-pack\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.ai-gateway\]\s+verify_jwt = false/);
  });

  it("keeps the existing in-function Authorization validation", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain('authHeader?.startsWith("Bearer ")');
    expect(source).toContain('authHeader.replace("Bearer ", "")');
    expect(source).toContain("supabase.auth.getUser(token)");
    expect(source).toContain('"Missing Authorization header"');
    expect(source).toContain('"Unauthorized"');
  });

  it("does not use privileged database or paid-provider work", () => {
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain(".update(");
    expect(source).not.toContain(".upsert(");
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("LOVABLE_API_KEY");
    expect(source).not.toContain("LEONARDO_API_KEY");
    expect(source).not.toContain("OPENAI_API_KEY");
    expect(source).not.toContain("ANTHROPIC_API_KEY");
  });
});
