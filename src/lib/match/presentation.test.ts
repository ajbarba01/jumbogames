/**
 * Tests for the presentation model: reveal on pristine matches, forced zoom
 * during countdown/playing/scoring, player-chosen zoom at the gate.
 */
import { describe, expect, it } from "vitest";
import { computePresentation, isPristine } from "./presentation";
import type { MatchState, SlotPhase, SlotState } from "./types";

function slot(
  ordinal: number,
  phase: SlotPhase,
  ready: string[] = [],
): SlotState {
  return {
    ordinal,
    kind: "stub",
    phase,
    ready,
    snapshot: null,
    countdownEndsAt: null,
    deadline: null,
    scoringEndsAt: null,
    payload: null,
    normA: null,
    normB: null,
    winner: null,
  };
}

function match(slots: SlotState[]): MatchState {
  return {
    matchId: "m",
    seed: "s",
    teamA: { id: "ta", name: "A", colorIndex: 1, members: ["a1"] },
    teamB: { id: "tb", name: "B", colorIndex: 2, members: ["b1"] },
    slots,
  };
}

describe("isPristine", () => {
  it("is true only for an untouched first gate", () => {
    expect(isPristine(match([slot(0, "gate")]))).toBe(true);
    expect(isPristine(match([slot(0, "gate", ["a1"])]))).toBe(false);
    expect(isPristine(match([slot(0, "playing")]))).toBe(false);
  });
});

describe("computePresentation", () => {
  it("shows the reveal until it is done", () => {
    const m = match([slot(0, "gate")]);
    expect(
      computePresentation({ match: m, revealDone: false, chosenZoom: null }),
    ).toEqual({ kind: "reveal" });
  });

  it("shows the overview at a gate unless the player zoomed in", () => {
    const m = match([slot(0, "gate")]);
    expect(
      computePresentation({ match: m, revealDone: true, chosenZoom: null }),
    ).toEqual({ kind: "overview" });
    expect(
      computePresentation({ match: m, revealDone: true, chosenZoom: 0 }),
    ).toEqual({ kind: "zoom", ordinal: 0 });
  });

  it("forces the zoom during countdown, playing, and scoring", () => {
    for (const phase of ["countdown", "playing", "scoring"] as const) {
      const m = match([slot(0, phase)]);
      expect(
        computePresentation({ match: m, revealDone: true, chosenZoom: null }),
      ).toEqual({ kind: "zoom", ordinal: 0 });
    }
  });

  it("shows complete after the last slot", () => {
    const m = match([slot(0, "done")]);
    expect(
      computePresentation({ match: m, revealDone: true, chosenZoom: null }),
    ).toEqual({ kind: "complete" });
  });
});
