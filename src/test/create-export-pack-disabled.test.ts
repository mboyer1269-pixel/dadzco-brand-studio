import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-export-pack/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("create-export-pack disabled guard", () => {
  it("returns disabled response before privileged export work can run", () => {
    expect(source).toContain(
      "create-export-pack is disabled pending export workflow review"
    );
    expect(source).toContain("disabled: true");
    expect(source).toContain("status: 503");
    expect(source).toContain(
      "Disabled intentionally until the export workflow is reviewed and aligned with lifecycle governance."
    );

    const disabledIndex = source.indexOf(
      "create-export-pack is disabled pending export workflow review"
    );
    const authIndex = source.indexOf('req.headers.get("Authorization")');
    const bodyIndex = source.indexOf("await req.json()");
    const serviceRoleKeyIndex = source.indexOf(
      'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'
    );
    const serviceRoleClientIndex = source.indexOf(
      "createClient(SUPABASE_URL, SERVICE_ROLE_KEY)"
    );
    const collectionReadIndex = source.indexOf('.from("collections")');
    const exportPackInsertIndex = source.indexOf('.from("export_packs")');
    const exportPackItemsInsertIndex = source.indexOf('.from("export_pack_items")');
    const collectionUpdateIndex = source.indexOf(
      '.update({ lifecycle_status: "ready_for_export", status: "ready_for_export" })'
    );
    const eventInsertIndex = source.indexOf('.from("collection_events").insert');

    expect(disabledIndex).toBeGreaterThan(-1);
    expect(disabledIndex).toBeLessThan(authIndex);
    expect(disabledIndex).toBeLessThan(bodyIndex);
    expect(disabledIndex).toBeLessThan(serviceRoleKeyIndex);
    expect(disabledIndex).toBeLessThan(serviceRoleClientIndex);
    expect(disabledIndex).toBeLessThan(collectionReadIndex);
    expect(disabledIndex).toBeLessThan(exportPackInsertIndex);
    expect(disabledIndex).toBeLessThan(exportPackItemsInsertIndex);
    expect(disabledIndex).toBeLessThan(collectionUpdateIndex);
    expect(disabledIndex).toBeLessThan(eventInsertIndex);
  });

  it("leaves create-export-pack verify_jwt unchanged", () => {
    expect(config).toMatch(
      /\[functions\.create-export-pack\]\s+verify_jwt = false/
    );
  });
});
