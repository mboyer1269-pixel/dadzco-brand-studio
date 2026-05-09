import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "coverage/",
      ".claude/",
      ".codex-worktrees/",
      "**/.claude/",
      "**/.codex-worktrees/",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Legacy debt: these files predate strict type enforcement and contain
    // intentional `any` usages (Supabase query results, AI API responses).
    // Do not add new files here — all new code must use explicit types.
    files: [
      "src/components/wizard/WizardStepPreview.tsx",
      "src/pages/BrandBook.tsx",
      "src/pages/CalendarPlanner.tsx",
      "src/pages/CollectionWizard.tsx",
      "src/pages/Collections.tsx",
      "src/pages/Create.tsx",
      "src/pages/Generate.tsx",
      "src/pages/RoundTable.tsx",
      "supabase/functions/approve-hq/index.ts",
      "supabase/functions/check-gates/index.ts",
      "supabase/functions/create-export-pack/index.ts",
      "supabase/functions/generate-mockup/index.ts",
      "supabase/functions/generate-stories/index.ts",
      "supabase/functions/generate-tasks/index.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
