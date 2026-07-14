/**
 * Vitest configuration for pure unit tests (co-located *.test.ts files under
 * src/). E2E flows live in e2e/ and run under Playwright, excluded here.
 */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
