/**
 * Vitest configuration for unit tests: pure logic under src/ (node env) and
 * kit component tests under packages/ui (jsdom via per-file pragma). E2E
 * flows live in e2e/ and run under Playwright, excluded here.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "src/**/*.test.ts",
      "packages/ui/src/**/*.test.ts",
      "packages/ui/src/**/*.test.tsx",
    ],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@jumbo/ui": fileURLToPath(
        new URL("./packages/ui/src/index.ts", import.meta.url),
      ),
    },
  },
});
