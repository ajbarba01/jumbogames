/**
 * Tests for the derived event log: score diffs between payload pushes become
 * anonymized team events, a first push only seeds a baseline, and anyone
 * outside the match roster is ignored.
 */
import { describe, expect, it } from "vitest";
import { deriveTickerEvents } from "./ticker";

const snapshot = { teamA: ["a1", "a2"], teamB: ["b1"] };

describe("deriveTickerEvents", () => {
  it("emits nothing on the first push, so a late viewer does not get the whole match at once", () => {
    const result = deriveTickerEvents({}, { a1: 6, a2: 0, b1: 3 }, snapshot, 1);
    expect(result.events).toEqual([]);
    expect(result.nextId).toBe(1);
  });

  it("emits one signed event for one player's change, attributed to their side", () => {
    const result = deriveTickerEvents(
      { a1: 0, a2: 0, b1: 0 },
      { a1: 3, a2: 0, b1: 0 },
      snapshot,
      1,
    );
    expect(result.events).toEqual([{ id: 1, side: "A", delta: 3 }]);
    expect(result.nextId).toBe(2);
  });

  it("attributes a team B player to side B and signs a loss", () => {
    const result = deriveTickerEvents(
      { a1: 0, a2: 0, b1: 3 },
      { a1: 0, a2: 0, b1: 2 },
      snapshot,
      7,
    );
    expect(result.events).toEqual([{ id: 7, side: "B", delta: -1 }]);
  });

  it("emits one event per changed player, in a stable order", () => {
    const result = deriveTickerEvents(
      { a1: 0, a2: 0, b1: 0 },
      { a1: 3, a2: 0, b1: -1 },
      snapshot,
      1,
    );
    expect(result.events).toEqual([
      { id: 1, side: "A", delta: 3 },
      { id: 2, side: "B", delta: -1 },
    ]);
    expect(result.nextId).toBe(3);
  });

  it("merges two answers that land between pushes into one summed row", () => {
    const result = deriveTickerEvents(
      { a1: 0 },
      { a1: 6 },
      { teamA: ["a1"], teamB: [] },
      1,
    );
    expect(result.events).toEqual([{ id: 1, side: "A", delta: 6 }]);
  });

  it("emits nothing when no score moved", () => {
    const scores = { a1: 3, a2: 0, b1: 0 };
    const result = deriveTickerEvents(scores, { ...scores }, snapshot, 4);
    expect(result.events).toEqual([]);
    expect(result.nextId).toBe(4);
  });

  it("ignores a player who is on neither side of this match", () => {
    const result = deriveTickerEvents({ ghost: 0 }, { ghost: 3 }, snapshot, 1);
    expect(result.events).toEqual([]);
  });

  it("treats a newly appearing player as a baseline, not as a gain", () => {
    const result = deriveTickerEvents({ a1: 0 }, { a1: 0, a2: 3 }, snapshot, 1);
    expect(result.events).toEqual([]);
  });
});
