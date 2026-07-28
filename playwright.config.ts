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
// wrangler dev's default. NEXT_PUBLIC_REALTIME_URL must agree with this, or
// the browser dials a Worker that is not there.
const REALTIME_PORT = 8787;

/**
 * Personas are provisioned per worker (see e2e/support/personas.ts), so every
 * extra worker is another set of sign-ins against a test project that accepts
 * thirty auth requests per five minutes per IP. Left to the default (half the
 * machine's cores — eleven on the development machine) a cold run would spend
 * the whole window on setup. CI runs one worker and pays six.
 */
const LOCAL_WORKERS = 4;

// Only these test-project variables are forwarded to the spawned server, so
// it can only ever run against the test Supabase project, never production.
const webServerEnv: Record<string, string> = {};
for (const key of [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OWNER_EMAILS",
  // The socket transport reads these; the snapshot route and match page mint
  // a ticket only when NEXT_PUBLIC_REALTIME_WS is "1", so the Supabase path
  // runs without them.
  "REALTIME_TICKET_KEY",
  "REALTIME_INTERNAL_SECRET",
  "NEXT_PUBLIC_REALTIME_URL",
  "NEXT_PUBLIC_REALTIME_WS",
] as const) {
  const value = process.env[key];
  if (value) webServerEnv[key] = value;
}

// The spawned server runs a production build, whose pool excludes the
// deterministic stub (it is devOnly). Opt it into the test pool, which admits
// every registered kind, so a spec can pick the minigame it wants in the
// create form; this flag only widens the pool and carries no credentials.
webServerEnv.JUMBO_TEST_MINIGAME_POOL = "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : LOCAL_WORKERS,
  reporter: "html",
  // Most assertions here wait on state that propagates across separate browser
  // contexts over Supabase Realtime (a team readying up, a round starting, a
  // bye landing on another player's board). Under CI load that hop can outrun
  // Playwright's 5s default and flake the round-start suite, so give every
  // web-first assertion more headroom; the per-test 30s budget still bounds a
  // genuinely stuck wait, and the slow lifecycle tests raise it themselves.
  expect: { timeout: 15_000 },
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
  webServer: [
    {
      command: `npm run build && npx next start -p ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: webServerEnv,
    },
    {
      // The realtime Worker. Readiness is a `port` check, not a `url` check:
      // the Worker serves only WebSocket upgrades, so every plain GET it
      // answers is a 426, and Playwright treats 4xx as not-ready — a `url`
      // probe here waits out the full timeout against a perfectly healthy
      // server.
      //
      // ORIGIN_URL is overridden because wrangler.jsonc points the Worker at
      // the conventional dev port (3000) while the E2E app is deliberately on
      // 3100. Without this the Worker would hydrate from whatever happens to
      // be on 3000 — quite possibly a dev server holding PRODUCTION
      // credentials, which is exactly what this config's port isolation exists
      // to prevent.
      command: `npm run dev -w @jumbo/realtime -- --var ORIGIN_URL:http://localhost:${E2E_PORT}`,
      port: REALTIME_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
