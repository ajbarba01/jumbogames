/**
 * Tests for teamShares: the per-player normalization behind the top bar's
 * split, so a bigger roster never reads as a bigger lead.
 */
import { describe, expect, it } from "vitest";
import { teamShares } from "./share";
import type { WordLockView } from "@jumbo/engine";

function view(partial: Partial<WordLockView>): WordLockView {
  return {
    side: 4,
    letters: "A".repeat(16),
    stale: "1".repeat(16),
    seed: "s",
    epoch: 0,
    startedAt: 0,
    words: [],
    scores: {},
    teamA: ["a1", "a2"],
    teamB: ["b1"],
    played: [],
    lastReject: null,
    ...partial,
  };
}

describe("teamShares", () => {
  it("normalizes by team size so a bigger team gains no edge", () => {
    const result = teamShares(view({ scores: { a1: 4, a2: 4, b1: 8 } }), "a1");
    // 8 tiles over 2 players versus 8 over 1: the smaller team leads.
    expect(result.a).toBeCloseTo(1 / 3);
    expect(result.b).toBeCloseTo(2 / 3);
    expect(result.tilesA).toBe(8);
    expect(result.tilesB).toBe(8);
  });

  it("reports the viewer's own held tiles", () => {
    expect(
      teamShares(view({ scores: { a1: 3, a2: 1, b1: 0 } }), "a1").mine,
    ).toBe(3);
  });

  it("splits evenly before anyone scores", () => {
    const result = teamShares(view({ scores: { a1: 0, a2: 0, b1: 0 } }), null);
    expect(result.a).toBeCloseTo(0.5);
    expect(result.b).toBeCloseTo(0.5);
  });
});
