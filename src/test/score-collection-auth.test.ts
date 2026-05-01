import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/score-collection/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("score-collection Edge Function auth guard", () => {
  it("requires verified admin auth before body parsing, provider calls, or service-role DB access", () => {
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
    expect(source).not.toContain("userId } = await req.json()");
    expect(source).not.toContain("owner } = await req.json()");

    const authIndex = source.indexOf('req.headers.get("Authorization")');
    const roleIndex = source.indexOf('.eq("role", "admin")');
    const bodyIndex = source.indexOf("await req.json()");
    const providerKeyIndex = source.indexOf('Deno.env.get("LOVABLE_API_KEY")');
    const serviceRoleClientIndex = source.indexOf(
      "createClient(SUPABASE_URL, SERVICE_ROLE_KEY)"
    );
    const collectionReadIndex = source.indexOf('.from("collections")');
    const brandRulesReadIndex = source.indexOf('.from("brand_rules")');
    const providerFetchIndex = source.indexOf(
      'fetch("https://ai.gateway.lovable.dev/v1/chat/completions"'
    );
    const scoreInsertIndex = source.indexOf('.from("collection_scores").insert');
    const collectionUpdateIndex = source.indexOf('.from("collections").update');

    expect(authIndex).toBeGreaterThan(-1);
    expect(roleIndex).toBeGreaterThan(authIndex);
    expect(serviceRoleClientIndex).toBeGreaterThan(authIndex);
    expect(roleIndex).toBeLessThan(bodyIndex);
    expect(roleIndex).toBeLessThan(providerKeyIndex);
    expect(roleIndex).toBeLessThan(collectionReadIndex);
    expect(roleIndex).toBeLessThan(brandRulesReadIndex);
    expect(roleIndex).toBeLessThan(providerFetchIndex);
    expect(roleIndex).toBeLessThan(scoreInsertIndex);
    expect(roleIndex).toBeLessThan(collectionUpdateIndex);
  });

  it("sets verify_jwt=true for score-collection", () => {
    expect(config).toMatch(
      /\[functions\.score-collection\]\s+verify_jwt = true/
    );
  });
});
