import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/save-collection/index.ts"),
  "utf8"
);

describe("save-collection Edge Function auth guard", () => {
  it("requires a verified admin JWT before service-role writes", () => {
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain(".auth.getClaims");
    expect(source).toContain('.eq("role", "admin")');
    expect(source).not.toContain("00000000-0000-0000-0000-000000000001");
    expect(source).not.toContain("userId } = await req.json()");
  });
});
