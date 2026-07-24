/**
 * Per-round minigame draw: K kinds from the eligible pool, seeded so the
 * draw is reproducible. The round — not each match — owns the draw; every
 * match in the round plays the same kinds in the same order. Distinct while
 * the pool lasts, cycling past it (only reachable with a dev-sized pool).
 */
import { seededShuffle } from "@/lib/random";
import type { MinigameKind } from "@/lib/minigames/types";

export function drawRoundGames(
  pool: MinigameKind[],
  k: number,
  seed: string,
): MinigameKind[] {
  if (pool.length === 0) return [];
  const shuffled = seededShuffle(pool, seed);
  return Array.from({ length: k }, (_, i) => shuffled[i % shuffled.length]!);
}

export type DrawCheck = { ok: true } | { ok: false; reason: string };

// A round start must never commit a draw that yields no playable slots: the
// round would flip to active with zero slots, no match would ever be live,
// and the UI offers no way back (restart 409s on state). Checked before any
// mutation so the round stays pending and the host can retry.
export function checkRoundDraw(drawn: MinigameKind[], k: number): DrawCheck {
  if (k < 1)
    return {
      ok: false,
      reason: "This tournament plays no minigames per match",
    };
  if (drawn.length < k) {
    return {
      ok: false,
      reason: "No minigames are available to play in this environment",
    };
  }
  return { ok: true };
}

// Trivia's slot payload is built from a question bank fetched at the IO edge;
// an empty bank has nothing to deal, so the check runs before the draw is
// committed rather than surfacing as an unplayable slot mid-match.
export function checkContentReady(
  drawn: MinigameKind[],
  triviaBankCount: number,
): DrawCheck {
  if (drawn.includes("trivia") && triviaBankCount < 1) {
    return {
      ok: false,
      reason:
        "The trivia question bank is empty — an admin must add questions first",
    };
  }
  return { ok: true };
}
