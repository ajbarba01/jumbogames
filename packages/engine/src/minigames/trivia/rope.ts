/**
 * Tug-of-war rope physics for the trivia minigame: a leaky integrator so a
 * streak by one side pins the rope while idle play relaxes back toward the
 * center, rather than a running score that never lets a lagging team catch
 * up.
 */

export interface RopeState {
  /** Position in [-1, +1]; +1 is team A's wall, -1 is team B's wall. */
  p: number;
  /** Epoch ms of the last update. */
  at: number;
}

export const ROPE_HALF_LIFE_MS = 10_000;
export const ROPE_PULL = 0.45;
export const WRONG_PULL_FRACTION = 1 / 3;

export function decayRope(rope: RopeState, now: number): RopeState {
  if (now <= rope.at) return rope;
  const elapsed = now - rope.at;
  const p = rope.p * 0.5 ** (elapsed / ROPE_HALF_LIFE_MS);
  return { p, at: now };
}

export function applyPull(
  rope: RopeState,
  now: number,
  opts: { side: "A" | "B"; correct: boolean; teamSize: number },
): RopeState {
  const decayed = decayRope(rope, now);
  const magnitude = opts.correct
    ? ROPE_PULL / opts.teamSize
    : -(ROPE_PULL / opts.teamSize) * WRONG_PULL_FRACTION;
  const impulse = opts.side === "A" ? magnitude : -magnitude;
  const p = Math.min(1, Math.max(-1, decayed.p + impulse));
  return { p, at: decayed.at };
}

export function pinnedSide(rope: RopeState): "A" | "B" | null {
  if (rope.p >= 1) return "A";
  if (rope.p <= -1) return "B";
  return null;
}
