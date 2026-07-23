/**
 * Playwright configuration: runs the E2E suite in e2e/ against a local
 * production build of the app.
 *
 * Data-safety: the app server is always spawned by this config on a
 * dedicated port (3100) with an explicit, minimal env — never adopted from
 * an already-running process on the conventional dev/prod port (3000).
 * `reuseExistingServer` is unconditionally false so a stray `next
 * dev`/`next start` (which may have loaded `.env.local` pointing at
 * PRODUCTION Supabase) can never be mistaken for the test server, which
 * would otherwise let E2E signups leak into production.
 */
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Local runs read the test-project credentials; in CI these come from the job
// env (the file is absent) and this call is a harmless no-op.
loadEnv({ path: ".env.test.local" });

const E2E_PORT = 3100;

// Only these test-project variables are forwarded to the spawned server, so
// it can only ever run against the test Supabase project, never production.
const webServerEnv: Record<string, string> = {};
for (const key of [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OWNER_EMAILS",
] as const) {
  const value = process.env[key];
  if (value) webServerEnv[key] = value;
}

// The spawned server runs a production build, whose minigame pool is empty
// (stub is devOnly). Opt it into the test pool so a started round draws real
// slots; this flag only widens the pool and carries no credentials.
webServerEnv.JUMBO_TEST_MINIGAME_POOL = "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: webServerEnv,
  },
});
