import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/extract-brand-rules/index.ts"),
  "utf8"
);

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

const brandBookSource = readFileSync(
  resolve(process.cwd(), "src/pages/BrandBook.tsx"),
  "utf8"
);

describe("extract-brand-rules Edge Function auth guard", () => {
  it("requires verified admin auth before file validation, storage, provider, or brand_rules access", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain('reason: "Unauthorized"');
    expect(source).toContain('reason: "Forbidden — admin role required"');
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain(".auth.getClaims");
    expect(source).toContain('.from("user_roles")');
    expect(source).toContain('.eq("role", "admin")');

    const authIndex = source.indexOf('req.headers.get("Authorization")');
    const roleIndex = source.indexOf('.eq("role", "admin")');
    const bodyIndex = source.indexOf("await req.json()");
    const brandFileLookupIndex = source.indexOf('.from("brand_files")');
    const storageDownloadIndex = source.indexOf('.from("brand-book-files")');
    const providerKeyIndex = source.indexOf('Deno.env.get("LOVABLE_API_KEY")');
    const providerFetchIndex = source.indexOf(
      'fetch("https://ai.gateway.lovable.dev/v1/chat/completions"'
    );
    const brandRulesReadIndex = source.indexOf('.from("brand_rules")');
    const brandRulesUpsertIndex = source.indexOf(
      '.from("brand_rules").upsert'
    );

    expect(authIndex).toBeGreaterThan(-1);
    expect(roleIndex).toBeGreaterThan(authIndex);
    expect(roleIndex).toBeLessThan(bodyIndex);
    expect(roleIndex).toBeLessThan(brandFileLookupIndex);
    expect(roleIndex).toBeLessThan(storageDownloadIndex);
    expect(roleIndex).toBeLessThan(providerKeyIndex);
    expect(roleIndex).toBeLessThan(providerFetchIndex);
    expect(roleIndex).toBeLessThan(brandRulesReadIndex);
    expect(roleIndex).toBeLessThan(brandRulesUpsertIndex);
  });

  it("validates the requested brand file before service-role storage download", () => {
    expect(source).toContain('.from("brand_files")');
    expect(source).toContain('.select("id")');
    expect(source).toContain('.eq("id", brandFileId)');
    expect(source).toContain('.eq("storage_path", storagePath)');
    expect(source).toContain('.eq("user_id", adminUserId)');
    expect(source).toContain('reason: "Brand file not found"');

    const brandFileLookupIndex = source.indexOf('.from("brand_files")');
    const storageDownloadIndex = source.indexOf('.from("brand-book-files")');
    const providerFetchIndex = source.indexOf(
      'fetch("https://ai.gateway.lovable.dev/v1/chat/completions"'
    );
    const brandRulesUpsertIndex = source.indexOf(
      '.from("brand_rules").upsert'
    );

    expect(brandFileLookupIndex).toBeGreaterThan(-1);
    expect(brandFileLookupIndex).toBeLessThan(storageDownloadIndex);
    expect(brandFileLookupIndex).toBeLessThan(providerFetchIndex);
    expect(brandFileLookupIndex).toBeLessThan(brandRulesUpsertIndex);
  });

  it("preserves the BrandBook response contract and fallback fields", () => {
    expect(source).toContain("ok: false");
    expect(source).toContain("fallbackUsed: false");
    expect(source).toContain("saved: false");
    expect(source).toContain("rulesLocked: false");
    expect(source).toContain("ruleCount: 0");
    expect(source).toContain("fallbackUsed = true");
    expect(source).toContain("FALLBACK_RULES");

    expect(brandBookSource).toContain("data?.ok");
    expect(brandBookSource).toContain("data?.fallbackUsed");
    expect(brandBookSource).toContain("data?.reason");
  });

  it("does not trust request-body identity and sets verify_jwt=true", () => {
    expect(source).not.toContain("userId } = await req.json()");
    expect(source).not.toContain("owner } = await req.json()");
    expect(source).not.toContain("adminUserId } = await req.json()");
    expect(config).toMatch(
      /\[functions\.extract-brand-rules\]\s+verify_jwt = true/
    );
  });
});
