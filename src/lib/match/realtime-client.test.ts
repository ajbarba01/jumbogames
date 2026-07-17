/**
 * Lifecycle tests for RealtimeMatchClient: construction must do no IO so a
 * StrictMode/Fast-Refresh double-invoked useState initializer cannot leak a
 * live client; start() begins IO idempotently and destroy() tears it down and
 * is safe before start(). Guards the double-client regression.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { subscribeToMatch, unsubscribe } = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  return { unsubscribe, subscribeToMatch: vi.fn(() => unsubscribe) };
});
vi.mock("@/lib/realtime/subscribe", () => ({ subscribeToMatch }));

import { RealtimeMatchClient } from "./realtime-client";
import { createMatch } from "./lifecycle";
import type { MatchView } from "./client";

const match = createMatch({
  matchId: "m1",
  seed: "s",
  teamA: { id: "a", name: "A", colorIndex: 1, members: ["p1"] },
  teamB: { id: "b", name: "B", colorIndex: 2, members: ["p2"] },
  kinds: ["stub"],
});
const view: MatchView = {
  match,
  viewerId: "p1",
  role: "player",
  playerLabels: {},
};
const opts = { tournamentId: "t1", matchId: "m1", serverNow: Date.now() };

function newClient(): RealtimeMatchClient {
  return new RealtimeMatchClient(view, opts);
}

describe("RealtimeMatchClient lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscribeToMatch.mockClear();
    unsubscribe.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ view, serverNow: Date.now() }),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does no IO on construction", () => {
    newClient();
    expect(subscribeToMatch).not.toHaveBeenCalled();
  });

  it("subscribes once on start and is idempotent", () => {
    const client = newClient();
    client.start();
    client.start();
    expect(subscribeToMatch).toHaveBeenCalledTimes(1);
    client.destroy();
  });

  it("destroy before start does not throw and never subscribed", () => {
    const client = newClient();
    expect(() => client.destroy()).not.toThrow();
    expect(subscribeToMatch).not.toHaveBeenCalled();
  });

  it("destroy after start unsubscribes", () => {
    const client = newClient();
    client.start();
    client.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("can restart after destroy (StrictMode remount)", () => {
    const client = newClient();
    client.start();
    client.destroy();
    client.start();
    expect(subscribeToMatch).toHaveBeenCalledTimes(2);
    client.destroy();
  });
});
