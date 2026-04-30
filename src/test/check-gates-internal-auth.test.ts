import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/check-gates/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("check-gates internal secret guard", () => {
  it("requires an internal secret before service-role access or alert writes", () => {
    expect(source).toContain('req.headers.get("x-internal-secret")');
    expect(source).toContain('Deno.env.get("CHECK_GATES_INTERNAL_SECRET")');
    expect(source).toContain(
      'return json({ error: "Internal secret not configured" }, 500)'
    );
    expect(source).toContain('return json({ error: "Unauthorized" }, 401)');

    const headerIndex = source.indexOf('req.headers.get("x-internal-secret")');
    const secretIndex = source.indexOf(
      'Deno.env.get("CHECK_GATES_INTERNAL_SECRET")'
    );
    const createClientIndex = source.indexOf("createClient(supabaseUrl, serviceKey)");
    const bodyIndex = source.indexOf("await req.json()");
    const userRolesIndex = source.indexOf('.from("user_roles")');
    const alertsReadIndex = source.indexOf('.from("strategic_alerts")');
    const alertsWriteIndex = source.indexOf('.from("strategic_alerts").insert');

    expect(headerIndex).toBeGreaterThan(-1);
    expect(secretIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeLessThan(createClientIndex);
    expect(secretIndex).toBeLessThan(createClientIndex);
    expect(headerIndex).toBeLessThan(bodyIndex);
    expect(secretIndex).toBeLessThan(bodyIndex);
    expect(headerIndex).toBeLessThan(userRolesIndex);
    expect(secretIndex).toBeLessThan(userRolesIndex);
    expect(headerIndex).toBeLessThan(alertsReadIndex);
    expect(secretIndex).toBeLessThan(alertsReadIndex);
    expect(headerIndex).toBeLessThan(alertsWriteIndex);
    expect(secretIndex).toBeLessThan(alertsWriteIndex);
  });

  it("keeps check-gates configured for internal-secret invocation", () => {
    expect(config).toMatch(
      /\[functions\.check-gates\]\s+verify_jwt = false/
    );
  });
});
