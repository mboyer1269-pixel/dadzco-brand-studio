import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/ai-gateway/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("ai-gateway disabled guard", () => {
  it("returns disabled response before privileged or paid-provider work can run", () => {
    expect(source).toContain(
      "ai-gateway is disabled pending AI routing strategy review"
    );
    expect(source).toContain("disabled: true");
    expect(source).toContain("status: 503");
    expect(source).toContain(
      "Disabled intentionally until the AI routing strategy is reviewed and aligned with the approved ai-route direction."
    );

    const disabledIndex = source.indexOf(
      "ai-gateway is disabled pending AI routing strategy review"
    );
    const authIndex = source.indexOf("authenticateRequest(req)");
    const bodyIndex = source.indexOf("await req.json()");
    const providerCallIndex = source.indexOf("await callGateway(");
    const routeTaskIndex = source.indexOf("const result = await routeTask");
    const successLogIndex = source.indexOf("await logGeneration({");
    const errorBodyIndex = source.indexOf("await req.clone().json()");
    const serviceRoleKeyIndex = source.indexOf(
      'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'
    );
    const serviceRoleClientIndex = source.indexOf(
      "createClient(SUPABASE_URL, SERVICE_ROLE_KEY)"
    );
    const generationLogsIndex = source.indexOf(
      '.from("ai_generation_logs").insert'
    );

    expect(disabledIndex).toBeGreaterThan(-1);
    expect(disabledIndex).toBeLessThan(authIndex);
    expect(disabledIndex).toBeLessThan(bodyIndex);
    expect(disabledIndex).toBeLessThan(routeTaskIndex);
    expect(disabledIndex).toBeLessThan(successLogIndex);
    expect(disabledIndex).toBeLessThan(errorBodyIndex);

    // Provider key reads and service-role writes remain below helper functions,
    // but the handler returns before any path can call those helpers.
    expect(routeTaskIndex).toBeGreaterThan(providerCallIndex);
    expect(providerCallIndex).toBeGreaterThan(source.indexOf('Deno.env.get("LOVABLE_API_KEY")'));
    expect(successLogIndex).toBeGreaterThan(serviceRoleKeyIndex);
    expect(successLogIndex).toBeGreaterThan(serviceRoleClientIndex);
    expect(successLogIndex).toBeGreaterThan(generationLogsIndex);
  });

  it("leaves ai-gateway verify_jwt unchanged", () => {
    expect(config).toMatch(/\[functions\.ai-gateway\]\s+verify_jwt = false/);
  });
});
