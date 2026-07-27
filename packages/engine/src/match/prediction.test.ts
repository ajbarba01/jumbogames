/**
 * Tests for the optimistic-prediction helper: only games declaring `predict`
 * are predictable, a prediction applies the game's own reducer, and pending
 * predictions retire on a server frame or on their TTL so none can leak.
 */
import { describe, expect, it } from "vitest";
import {
  canPredict,
  retirePredictions,
  PREDICTION_TTL_MS,
  type Pending,
} from "./prediction";
import type { MatchState } from "./types";

const emptyState = { slots: [] } as unknown as MatchState;
const pending = (seq: number, createdAt: number): Pending => ({
  seq,
  state: emptyState,
  createdAt,
});

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
