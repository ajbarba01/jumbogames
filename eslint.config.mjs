import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent scratch space — holds git worktrees whose generated Prisma client
    // and .next output otherwise swamp the repo-wide gates.
    ".claude/**",
    // wrangler's local dev build cache (apps/realtime), regenerated per run.
    "**/.wrangler/**",
  ]),
]);

export default eslintConfig;
