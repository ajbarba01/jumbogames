/**
 * Tests for the wipe state machine: the covering hold leaves only when the
 * destination has committed AND the min floor has passed (order-independent),
 * a fast commit during the in-sweep is remembered, the max cue only fires while
 * covered, the force-reveal ceiling escapes an uncommitted hold, and finishing
 * the reveal resets to idle.
 */
import { describe, expect, it } from "vitest";
import { initialWipeState, wipeReducer, type WipeState } from "./machine";

function drive(events: Parameters<typeof wipeReducer>[1][]): WipeState {
  return events.reduce(wipeReducer, initialWipeState);
}

describe("wipeReducer", () => {
  it("navStart from idle begins covering and carries the label", () => {
    const s = drive([{ type: "navStart", label: "Round 1" }]);
    expect(s.phase).toBe("covering");
    expect(s.label).toBe("Round 1");
  });

  it("ignores navStart when not idle", () => {
    const s = drive([
      { type: "navStart", label: null },
      { type: "navStart", label: "again" },
    ]);
    expect(s.label).toBeNull();
  });

  it("holds covered until BOTH committed and minElapsed (commit first)", () => {
    let s = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "committed" },
    ]);
    expect(s.phase).toBe("covered");
    s = wipeReducer(s, { type: "minElapsed" });
    expect(s.phase).toBe("revealing");
  });

  it("holds covered until BOTH committed and minElapsed (min first)", () => {
    let s = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "minElapsed" },
    ]);
    expect(s.phase).toBe("covered");
    s = wipeReducer(s, { type: "committed" });
    expect(s.phase).toBe("revealing");
  });

  it("remembers a commit that arrives during the in-sweep", () => {
    const s = drive([
      { type: "navStart", label: null },
      { type: "committed" },
      { type: "minElapsed" },
      { type: "wipeInDone" },
    ]);
    expect(s.phase).toBe("revealing");
  });

  it("raises the still-loading cue only while covered", () => {
    const covering = drive([
      { type: "navStart", label: null },
      { type: "maxElapsed" },
    ]);
    expect(covering.showCue).toBe(false);
    const covered = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "maxElapsed" },
    ]);
    expect(covered.showCue).toBe(true);
  });

  it("forceElapsed reveals from covered even without a commit", () => {
    const s = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "forceElapsed" },
    ]);
    expect(s.phase).toBe("revealing");
    expect(s.committed).toBe(false);
  });

  it("forceElapsed is a no-op outside covered", () => {
    const idle = wipeReducer(initialWipeState, { type: "forceElapsed" });
    expect(idle).toEqual(initialWipeState);

    const covering = drive([{ type: "navStart", label: null }]);
    expect(wipeReducer(covering, { type: "forceElapsed" })).toEqual(covering);

    const revealing = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "committed" },
      { type: "minElapsed" },
    ]);
    expect(revealing.phase).toBe("revealing");
    expect(wipeReducer(revealing, { type: "forceElapsed" })).toEqual(revealing);
  });

  it("a commit landing after a force-reveal cannot re-enter the hold", () => {
    let s = drive([
      { type: "navStart", label: null },
      { type: "wipeInDone" },
      { type: "forceElapsed" },
      { type: "wipeOutDone" },
    ]);
    expect(s).toEqual(initialWipeState);
    s = wipeReducer(s, { type: "committed" });
    expect(s.phase).toBe("idle");
  });

  it("resets to idle when the reveal finishes", () => {
    const s = drive([
      { type: "navStart", label: "x" },
      { type: "wipeInDone" },
      { type: "committed" },
      { type: "minElapsed" },
      { type: "wipeOutDone" },
    ]);
    expect(s).toEqual(initialWipeState);
  });
});
