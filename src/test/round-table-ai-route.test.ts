import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/round-table/index.ts"),
  "utf8"
);

describe("round-table ai-route migration", () => {
  it("routes collection generation through ai-route with the original user JWT", () => {
    expect(source).toContain('/functions/v1/ai-route');
    expect(source).toContain('taskType: "structured_task"');
    expect(source).toContain("Authorization: authHeader");
    expect(source).toContain("apikey: SUPABASE_ANON_KEY");

    const aiRouteIndex = source.indexOf('/functions/v1/ai-route');
    const authHeaderIndex = source.indexOf("Authorization: authHeader", aiRouteIndex);
    const serviceRoleHeaderIndex = source.indexOf("Authorization: `Bearer ${SERVICE_ROLE_KEY}`", aiRouteIndex);
    const bodyIndex = source.indexOf("ROUND_TABLE_SYSTEM", aiRouteIndex);

    expect(aiRouteIndex).toBeGreaterThan(-1);
    expect(authHeaderIndex).toBeGreaterThan(aiRouteIndex);
    expect(bodyIndex).toBeGreaterThan(aiRouteIndex);
    expect(serviceRoleHeaderIndex).toBe(-1);
  });

  it("keeps CHAP on the existing round-table path and preserves the UI response contract", () => {
    expect(source).toContain('const isChap = taskType === "chap";');
    expect(source).toContain("CHAP_PROMPT");
    expect(source).toContain('model: "google/gemini-2.5-flash"');
    expect(source).toContain("validateAndEnforce(parsed)");
    expect(source).toContain("parsed.run_meta");
    expect(source).toContain("model_used");
    expect(source).toContain("fallback_used");
  });
});
