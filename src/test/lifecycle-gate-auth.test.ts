import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/lifecycle-gate/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("lifecycle-gate auth hardening", () => {
  it("enables platform JWT verification for lifecycle-gate", () => {
    expect(config).toMatch(/\[functions\.lifecycle-gate\]\s+verify_jwt = true/);
  });

  it("keeps Authorization validation before service-role access", () => {
    const authHeaderIndex = source.indexOf('req.headers.get("Authorization")');
    const claimsIndex = source.indexOf("supabase.auth.getClaims(token)");
    const serviceRoleKeyIndex = source.indexOf(
      'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'
    );
    const serviceRoleClientIndex = source.indexOf(
      "createClient(SUPABASE_URL, SERVICE_ROLE_KEY)"
    );

    expect(authHeaderIndex).toBeGreaterThan(-1);
    expect(claimsIndex).toBeGreaterThan(-1);
    expect(serviceRoleKeyIndex).toBeGreaterThan(-1);
    expect(serviceRoleClientIndex).toBeGreaterThan(-1);
    expect(authHeaderIndex).toBeLessThan(serviceRoleKeyIndex);
    expect(claimsIndex).toBeLessThan(serviceRoleKeyIndex);
    expect(claimsIndex).toBeLessThan(serviceRoleClientIndex);
  });

  it("keeps admin authorization before lifecycle writes", () => {
    const userRolesIndex = source.indexOf('.from("user_roles")');
    const adminRoleIndex = source.indexOf('.eq("role", "admin")');
    const forbiddenIndex = source.indexOf("admin role required");
    const collectionUpdateIndex = source.indexOf(".update(updateData)");
    const eventInsertIndex = source.indexOf('.from("collection_events").insert');

    expect(userRolesIndex).toBeGreaterThan(-1);
    expect(adminRoleIndex).toBeGreaterThan(-1);
    expect(forbiddenIndex).toBeGreaterThan(-1);
    expect(collectionUpdateIndex).toBeGreaterThan(-1);
    expect(eventInsertIndex).toBeGreaterThan(-1);
    expect(userRolesIndex).toBeLessThan(collectionUpdateIndex);
    expect(adminRoleIndex).toBeLessThan(collectionUpdateIndex);
    expect(forbiddenIndex).toBeLessThan(collectionUpdateIndex);
    expect(userRolesIndex).toBeLessThan(eventInsertIndex);
    expect(adminRoleIndex).toBeLessThan(eventInsertIndex);
    expect(forbiddenIndex).toBeLessThan(eventInsertIndex);
  });

  it("keeps lifecycle transition business logic present", () => {
    expect(source).toContain('idea: ["strategy_review"]');
    expect(source).toContain('strategy_review: ["mockup_stage", "idea"]');
    expect(source).toContain(
      'mockup_stage: ["approved_for_production", "strategy_review"]'
    );
    expect(source).toContain(
      'approved_for_production: ["in_production", "mockup_stage"]'
    );
    expect(source).toContain(
      'in_production: ["ready_for_export", "approved_for_production"]'
    );
    expect(source).toContain('ready_for_export: ["exported", "in_production"]');
    expect(source).toContain('updateData.margin_validated = true');
    expect(source).toContain('updateData.financial_gate_passed = true');
  });
});
