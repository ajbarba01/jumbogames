/**
 * Tests for round slot seeding: each non-bye match gets K slots in the drawn
 * order, slot 0 open at the gate and the rest upcoming; byes get none.
 */
import { describe, expect, it } from "vitest";
import { buildRoundSlots } from "./round-slots";
import type { MinigameKind } from "@/lib/minigames/types";

const drawn = ["stub", "stub"] as MinigameKind[];

describe("buildRoundSlots", () => {
  it("creates K slots per non-bye match, gate then upcoming", () => {
    const seeds = buildRoundSlots([{ id: "m1", isBye: false }], drawn);
    expect(seeds).toEqual([
      { matchId: "m1", ordinal: 0, kind: "stub", phase: "gate" },
      { matchId: "m1", ordinal: 1, kind: "stub", phase: "upcoming" },
    ]);
  });

  it("skips bye matches", () => {
    const seeds = buildRoundSlots(
      [
        { id: "m1", isBye: false },
        { id: "bye", isBye: true },
      ],
      drawn,
    );
    expect(seeds.every((s) => s.matchId === "m1")).toBe(true);
    expect(seeds).toHaveLength(2);
  });

  it("returns [] when nothing was drawn", () => {
    expect(buildRoundSlots([{ id: "m1", isBye: false }], [])).toEqual([]);
  });
});
