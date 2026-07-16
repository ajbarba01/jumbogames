/**
 * Tests for the fake match client: bots ready up and mash on fake timers, a
 * full K=1 match runs to completion, kick unblocks a stuck gate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeMatchClient } from "./fake-client";
import { derivePhase } from "./derive";

const config = {
  k: 1,
  role: "player" as const,
  botsPerTeam: 1,
  botReadyDelayMs: 500,
  botMashIntervalMs: 300,
};

describe("FakeMatchClient", () => {
  let client: FakeMatchClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new FakeMatchClient(config);
  });

  afterEach(() => {
    client.destroy();
    vi.useRealTimers();
  });

  it("runs a full match to completion once the viewer readies", () => {
    client.ready(0);
    // bots ready (~1s), countdown 3s, play 10s, scoring 5s + slack
    vi.advanceTimersByTime(25_000);
    const view = client.getView();
    expect(derivePhase(view.match).kind).toBe("complete");
    expect(view.match.slots[0]!.winner).not.toBeNull();
  });

  it("notifies subscribers on state changes", () => {
    const listener = vi.fn();
    client.subscribe(listener);
    client.ready(0);
    expect(listener).toHaveBeenCalled();
  });

  it("kick unblocks a gate the kicked player was stalling", () => {
    // Bots auto-ready; the viewer ("you") is the only stall a test can hold
    vi.advanceTimersByTime(2_000);
    expect(client.getView().match.slots[0]!.phase).toBe("gate");
    client.debugKick("you");
    expect(client.getView().match.slots[0]!.phase).toBe("countdown");
  });

  it("late-joined bots enter the roster immediately", () => {
    const before = client.getView().match.teamB.members.length;
    client.debugJoinBot("B");
    expect(client.getView().match.teamB.members.length).toBe(before + 1);
  });
});
