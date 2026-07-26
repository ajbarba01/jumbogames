/**
 * One definition of "what is playable here". The create surface offers these
 * kinds and the round draw intersects a game's stored pool with them, so a
 * stale or environment-inappropriate stored kind degrades to an empty draw
 * (a handled 409) rather than an absent registry entry (a crash).
 */
import type { MinigameKind } from "./types";
import { poolFor } from "./registry";

export type EligibleEnv = "development" | "test" | "production";

// Playwright runs against a production build, where the production pool is
// empty of dev-only kinds. The test pool is a widening only: it admits every
// registered kind, dev-only ones included, so a spec can exercise the
// deterministic stub and the real trivia surface alike by picking the kind it
// wants in the create form. Never set JUMBO_TEST_MINIGAME_POOL in Vercel.
export function eligibleEnv(): EligibleEnv {
  if (process.env.JUMBO_TEST_MINIGAME_POOL === "1") return "test";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/** A game's stored pool narrowed to the kinds playable in this environment. */
export function eligiblePool(
  stored: MinigameKind[],
  env: EligibleEnv,
): MinigameKind[] {
  const playable = new Set(poolFor(env));
  return stored.filter((kind) => playable.has(kind));
}
