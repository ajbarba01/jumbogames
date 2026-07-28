/**
 * Tests for the optimistic-prediction helper: only games declaring `predict`
 * are predictable, a prediction applies the game's own reducer, and pending
 * predictions retire on a server frame or on their TTL so none can leak.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  canPredict,
  predictSlot,
  retirePredictions,
  PREDICTION_TTL_MS,
  type Pending,
} from "./prediction";
import { MINIGAMES } from "../minigames/registry";
import type { MatchState } from "./types";

const emptyState = { slots: [] } as unknown as MatchState;
const pending = (seq: number, createdAt: number): Pending => ({
  seq,
  state: emptyState,
  createdAt,
});

/** One slot, only the fields predictSlot reads. */
const slotState = (phase: string, payload: unknown): MatchState =>
  ({
    slots: [{ ordinal: 0, kind: "stub", phase, payload }],
  }) as unknown as MatchState;

describe("canPredict", () => {
  it("is false for trivia, which redacts the correct answer", () => {
    expect(canPredict("trivia")).toBe(false);
  });

  it("is false for stub, which declares no predict", () => {
    expect(canPredict("stub")).toBe(false);
  });
});

describe("retirePredictions", () => {
  it("drops predictions the server has caught up to", () => {
    const kept = retirePredictions([pending(1, 0), pending(5, 0)], 3, 100);
    expect(kept.map((p) => p.seq)).toEqual([5]);
  });

  it("drops predictions older than the TTL even if unacknowledged", () => {
    const kept = retirePredictions([pending(9, 0)], 0, PREDICTION_TTL_MS + 1);
    expect(kept).toEqual([]);
  });

  it("keeps a fresh unacknowledged prediction", () => {
    const kept = retirePredictions([pending(9, 0)], 0, 10);
    expect(kept.map((p) => p.seq)).toEqual([9]);
  });
});

// No shipped game declares `predict` — trivia must not (decision 23) and stub
// simply doesn't — so the apply path is unreachable through the real registry.
// Lending stub a predict for the duration is what lets it be exercised at all;
// without this the function has never run, in production or in a test.
describe("predictSlot", () => {
  const registry = MINIGAMES as unknown as Record<
    string,
    { predict?: (s: unknown, p: string, a: unknown, n: number) => unknown }
  >;
  afterEach(() => {
    delete registry.stub.predict;
  });

  it("applies the game's own reducer to the slot's payload", () => {
    registry.stub.predict = (payload, playerId) => ({
      ...(payload as Record<string, unknown>),
      lastTapBy: playerId,
    });
    const next = predictSlot(
      slotState("playing", { taps: 2 }),
      0,
      "p1",
      { tap: true },
      100,
    );
    expect(next.slots[0]!.payload).toEqual({ taps: 2, lastTapBy: "p1" });
  });

  it("leaves state untouched when the game declares no predict", () => {
    const state = slotState("playing", { taps: 2 });
    expect(predictSlot(state, 0, "p1", { tap: true }, 100)).toBe(state);
  });

  it("leaves state untouched when the slot is not in play", () => {
    registry.stub.predict = (payload) => ({
      ...(payload as Record<string, unknown>),
      moved: true,
    });
    const state = slotState("gate", { taps: 2 });
    expect(predictSlot(state, 0, "p1", { tap: true }, 100)).toBe(state);
  });

  it("leaves state untouched when the reducer returns the same payload", () => {
    registry.stub.predict = (payload) => payload;
    const state = slotState("playing", { taps: 2 });
    expect(predictSlot(state, 0, "p1", { tap: true }, 100)).toBe(state);
  });

  it("leaves state untouched for an unknown ordinal", () => {
    registry.stub.predict = (payload) => ({
      ...(payload as Record<string, unknown>),
      moved: true,
    });
    const state = slotState("playing", { taps: 2 });
    expect(predictSlot(state, 9, "p1", { tap: true }, 100)).toBe(state);
  });
});
