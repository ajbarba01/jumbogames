/**
 * Routing tests for the Worker entrypoint: only /room/:matchId is served, only
 * as a WebSocket upgrade, and anything else is refused before a Durable Object
 * is addressed.
 */
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("worker routing", () => {
  it("404s an unknown path", async () => {
    const res = await SELF.fetch("https://example.test/nope");
    expect(res.status).toBe(404);
  });

  it("426s /room/:id without an upgrade header", async () => {
    const res = await SELF.fetch("https://example.test/room/m1");
    expect(res.status).toBe(426);
  });

  it("exposes the MATCH_ROOM binding", () => {
    expect(env.MATCH_ROOM).toBeDefined();
  });
});
