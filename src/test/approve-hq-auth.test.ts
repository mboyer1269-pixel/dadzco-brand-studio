import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/approve-hq/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("approve-hq Edge Function auth guard", () => {
  it("requires authenticated admin ownership before lifecycle writes", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain('JSON.stringify({ error: "Unauthorized" })');
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain(".auth.getUser");
    expect(source).toContain('.from("user_roles")');
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain('JSON.stringify({ error: "Forbidden — admin role required" })');
    expect(source).toContain('JSON.stringify({ error: "Forbidden — collection ownership required" })');
    expect(source).not.toContain("userId } = await req.json()");
    expect(source).not.toContain("owner } = await req.json()");

    const authIndex = source.indexOf('req.headers.get("Authorization")');
    const serviceRoleClientIndex = source.indexOf(
      "createClient(SUPABASE_URL, SERVICE_ROLE_KEY)"
    );
    const roleIndex = source.indexOf('.eq("role", "admin")');
    const bodyIndex = source.indexOf("await req.json()");
    const collectionReadIndex = source.indexOf('.from("collections")');
    const ownershipIndex = source.indexOf("collection.user_id !== userId");
    const scoreReadIndex = source.indexOf('.from("collection_scores")');
    const brandRulesReadIndex = source.indexOf('.from("brand_rules")');
    const collectionUpdateIndex = source.indexOf('.from("collections").update');
    const eventInsertIndex = source.indexOf('.from("collection_events").insert');

    expect(authIndex).toBeGreaterThan(-1);
    expect(serviceRoleClientIndex).toBeGreaterThan(authIndex);
    expect(roleIndex).toBeGreaterThan(serviceRoleClientIndex);
    expect(roleIndex).toBeLessThan(bodyIndex);
    expect(roleIndex).toBeLessThan(collectionReadIndex);
    expect(ownershipIndex).toBeGreaterThan(collectionReadIndex);
    expect(scoreReadIndex).toBeGreaterThan(ownershipIndex);
    expect(brandRulesReadIndex).toBeGreaterThan(ownershipIndex);
    expect(collectionUpdateIndex).toBeGreaterThan(ownershipIndex);
    expect(eventInsertIndex).toBeGreaterThan(ownershipIndex);
  });

  it("sets verify_jwt=true for approve-hq", () => {
    expect(config).toMatch(/\[functions\.approve-hq\]\s+verify_jwt = true/);
  });
});
