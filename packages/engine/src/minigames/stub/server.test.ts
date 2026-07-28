/**
 * Tests for the stub minigame server half: init zeroes the snapshot roster,
 * mash actions increment only known players, scores pass counts through.
 */
import { describe, expect, it } from "vitest";
import { stubGame } from "./server";

const snapshot = { teamA: ["p1", "p2"], teamB: ["p3"] };

describe("stubGame", () => {
  it("initializes a zero count per snapshot player", () => {
    expect(stubGame.init(snapshot, "seed")).toEqual({
      counts: { p1: 0, p2: 0, p3: 0 },
    });
  });

  it("increments the acting player's count", () => {
    const s0 = stubGame.init(snapshot, "seed");
    const s1 = stubGame.apply(s0, "p1", { type: "mash" }, 0);
    expect(s1.counts).toEqual({ p1: 1, p2: 0, p3: 0 });
    expect(s0.counts.p1).toBe(0); // immutable
  });

  it("ignores players outside the snapshot", () => {
    const s0 = stubGame.init(snapshot, "seed");
    expect(stubGame.apply(s0, "intruder", { type: "mash" }, 0)).toBe(s0);
  });

  it("never self-finishes (timer-bounded only)", () => {
    expect(stubGame.isFinished(stubGame.init(snapshot, "s"), 999999)).toBe(
      false,
    );
  });

  it("reports counts as per-player raw scores", () => {
    let s = stubGame.init(snapshot, "seed");
    s = stubGame.apply(s, "p3", { type: "mash" }, 0);
    expect(stubGame.scores(s)).toEqual({ p1: 0, p2: 0, p3: 1 });
  });
});
