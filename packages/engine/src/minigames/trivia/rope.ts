/**
 * The rope. Position is the time-integral of net pulling force rather than a
 * sum of per-answer impulses: each team's tier sets a constant force, so the
 * rope moves continuously and its velocity reads as the tier gap. Nothing
 * pulls it back toward centre — ground is only lost to the other team
 * out-pulling you, which is what makes a deficit a distance rather than a
 * verdict.
 *
 * Force is piecewise-constant between tier changes and tier changes are
 * deterministic, so the integral is exact arithmetic over a handful of
 * segments — no simulation, and no tick loop behind the match.
 */
import { tierAt, tierBreakpoints, type TierState } from "./tiers";
import { ROPE_DIVISOR } from "./tuning";

export interface RopeState {
  /** Position in [-1, +1]; +1 is team A's wall, -1 is team B's wall. */
  p: number;
  /** Epoch ms through which the integral has been carried. */
  at: number;
}

export const INITIAL_ROPE: RopeState = { p: 0, at: 0 };

/**
 * Rope units per second per tier of gap. A team's answer rate is the mean of
 * its members', so between-team skill gaps shrink as 1/sqrt(n) — sensitivity
 * grows as sqrt(n) to hold the drama constant from a 2v2 to a 10v10 rather
 * than letting the biggest games have the most static rope.
 */
export function ropeK(teamSizeA: number, teamSizeB: number): number {
  const mean = Math.max(1, (teamSizeA + teamSizeB) / 2);
  return Math.sqrt(mean) / ROPE_DIVISOR;
}

export function advanceRope(
  rope: RopeState,
  tierA: TierState,
  tierB: TierState,
  now: number,
  k: number,
): RopeState {
  if (now <= rope.at) return rope;
  if (rope.p >= 1 || rope.p <= -1) return { p: rope.p, at: now };

  const bounds = [
    rope.at,
    ...tierBreakpoints(tierA, rope.at, now),
    ...tierBreakpoints(tierB, rope.at, now),
    now,
  ].sort((a, b) => a - b);

  let p = rope.p;
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    if (end <= start) continue;
    // Sampled mid-segment: force is constant across the interior, and a
    // midpoint sidesteps which side of a breakpoint an endpoint belongs to.
    const mid = (start + end) / 2;
    const gap = tierAt(tierA, mid) - tierAt(tierB, mid);
    p += k * gap * ((end - start) / 1000);
    if (p >= 1) return { p: 1, at: end };
    if (p <= -1) return { p: -1, at: end };
  }
  return { p, at: now };
}

export function pinnedSide(rope: RopeState): "A" | "B" | null {
  if (rope.p >= 1) return "A";
  if (rope.p <= -1) return "B";
  return null;
}
