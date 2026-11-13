import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-export-pack/index.ts"),
  "utf8"
);

const sharedAuth = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/auth.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("create-export-pack hardening", () => {
  it("enables platform JWT verification", () => {
    expect(config).toMatch(/\[functions\.create-export-pack\]\s+verify_jwt = true/);
  });

  it("is no longer a disabled 503 stub", () => {
    expect(source).not.toContain("create-export-pack is disabled pending export workflow review");
    expect(source).not.toContain("disabled: true");
  });

  it("requires a user session and admin role before reading the body or doing privileged work", () => {
    const sessionIndex = source.indexOf("await requireUserSession(req)");
    const adminIndex = source.indexOf("await requireAdmin(session.sub)");
    const bodyIndex = source.indexOf("await req.json()");
    const collectionReadIndex = source.indexOf('.from("collections")');
    const sealReadIndex = source.indexOf('.from("collection_seals")');
    const packInsertIndex = source.indexOf('.from("export_packs").insert');

    expect(sessionIndex).toBeGreaterThan(-1);
    expect(adminIndex).toBeGreaterThan(sessionIndex);
    expect(bodyIndex).toBeGreaterThan(adminIndex);
    expect(collectionReadIndex).toBeGreaterThan(adminIndex);
    expect(sealReadIndex).toBeGreaterThan(adminIndex);
    expect(packInsertIndex).toBeGreaterThan(adminIndex);
  });

  it("enforces collection ownership", () => {
    expect(source).toContain("collection.user_id !== userId");
    expect(source).toContain('"Forbidden — collection ownership required"');
  });

  it("requires all 3 seals approved before any write", () => {
    expect(source).toContain('const REQUIRED_SEALS = ["brand_dna", "finance_gate", "production_ready"]');
    expect(source).toContain('.eq("status", "approved")');
    expect(source).toContain("missing_seals: missingSeals");

    const sealGateIndex = source.indexOf("if (missingSeals.length > 0)");
    const packInsertIndex = source.indexOf('.from("export_packs").insert');
    const itemsInsertIndex = source.indexOf('.from("export_pack_items").insert');
    const eventInsertIndex = source.indexOf('.from("collection_events").insert');

    expect(sealGateIndex).toBeGreaterThan(-1);
    expect(sealGateIndex).toBeLessThan(packInsertIndex);
    expect(sealGateIndex).toBeLessThan(itemsInsertIndex);
    expect(sealGateIndex).toBeLessThan(eventInsertIndex);
  });

  it("never writes lifecycle_status or the deprecated status field on collections", () => {
    expect(source).not.toMatch(/\.from\("collections"\)\s*\.update/);
    expect(source).not.toContain('status: "ready_for_export"');
  });

  it("returns prompts, production specs and SEO copy per SKU", () => {
    expect(source).toContain("prompts: {");
    expect(source).toContain("production_specs: {");
    expect(source).toContain("seo_copy: {");
    expect(source).toContain('.from("stories")');
  });

  it("checks errors on every DB read and write", () => {
    for (const name of [
      "fetchErr",
      "sealsErr",
      "storiesErr",
      "versionErr",
      "packErr",
      "itemsErr",
      "eventErr",
    ]) {
      expect(source).toContain(`if (${name})`);
    }
    expect(source).toContain('.from("export_packs").delete().eq("id", packId)');
  });

  it("does not leak internal error messages", () => {
    expect(source).not.toContain("e instanceof Error ? e.message");
    expect(source).not.toContain("packErr?.message");
    expect(source).toContain('return json({ error: "Internal server error" }, 500)');
  });

  it("uses the pinned shared auth helpers", () => {
    expect(source).toContain('from "../_shared/auth.ts"');
    expect(sharedAuth).toContain("supabase-js@2.97.0");
    expect(sharedAuth).toContain(".auth.getClaims(token)");
    expect(sharedAuth).toContain('claims.role !== "authenticated"');
    expect(sharedAuth).toContain('.from("user_roles")');
    expect(sharedAuth).toContain('.eq("role", "admin")');
  });
});
