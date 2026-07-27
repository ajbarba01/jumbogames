/**
 * Vitest configuration for the realtime Worker. Tests execute inside workerd
 * via the Workers pool rather than jsdom, so Durable Object bindings, storage
 * and hibernation behave as they do in production.
 *
 * The installed @cloudflare/vitest-pool-workers (0.18.x) dropped the
 * `defineWorkersConfig` helper and the `/config` subpath export the brief's
 * snippet used; the current API wires the pool in as a Vite plugin
 * (`cloudflareTest`) on top of plain `defineConfig` from `vitest/config`.
 */
import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          REALTIME_SHARED_SECRET: "test-secret-at-least-32-bytes-000",
        },
      },
    }),
  ],
});
