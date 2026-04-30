import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionSources = {
  "round-table": readFileSync(
    resolve(process.cwd(), "supabase/functions/round-table/index.ts"),
    "utf8"
  ),
  "generate-stories": readFileSync(
    resolve(process.cwd(), "supabase/functions/generate-stories/index.ts"),
    "utf8"
  ),
  "generate-tasks": readFileSync(
    resolve(process.cwd(), "supabase/functions/generate-tasks/index.ts"),
    "utf8"
  ),
};

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8"
);

describe("public AI Edge Function auth guards", () => {
  it.each(Object.entries(functionSources))(
    "%s requires verified admin auth before body parsing or Lovable calls",
    (_functionName, source) => {
      expect(source).toContain(
        'import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";'
      );
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

      const authIndex = source.indexOf('req.headers.get("Authorization")');
      const roleIndex = source.indexOf('.eq("role", "admin")');
      const bodyIndex = source.indexOf("await req.json()");
      const keyIndex = source.indexOf('Deno.env.get("LOVABLE_API_KEY")');
      const providerIndex = source.indexOf(
        'fetch("https://ai.gateway.lovable.dev/v1/chat/completions"'
      );

      expect(authIndex).toBeGreaterThan(-1);
      expect(roleIndex).toBeGreaterThan(authIndex);
      expect(authIndex).toBeLessThan(bodyIndex);
      expect(roleIndex).toBeLessThan(bodyIndex);
      expect(authIndex).toBeLessThan(keyIndex);
      expect(roleIndex).toBeLessThan(keyIndex);
      expect(authIndex).toBeLessThan(providerIndex);
      expect(roleIndex).toBeLessThan(providerIndex);
    }
  );

  it.each(["round-table", "generate-stories", "generate-tasks"])(
    "sets verify_jwt=true for %s",
    (functionName) => {
      const blockMatch = config.match(
        new RegExp(`\\[functions\\.${functionName}\\]\\s+verify_jwt = true`)
      );

      expect(blockMatch).not.toBeNull();
    }
  );
});
