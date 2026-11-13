import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // A custom exclude list replaces Vitest's defaults, so test files must be
      // excluded explicitly or they inflate business-logic coverage.
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/__tests__/**",
        "src/integrations/supabase/types.ts",
        "src/vite-env.d.ts",
        "src/components/**",  // UI components — covered by E2E/integration tests
        "src/pages/**",       // Page components — covered by E2E/integration tests
        "src/App.tsx",
        "src/test/**",
        "src/main.tsx",
      ],
      thresholds: {
        lines: 35,
        functions: 40,
        branches: 35,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
