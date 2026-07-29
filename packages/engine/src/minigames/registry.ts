/**
 * Server-side minigame registry: kind → server half + metadata. No React —
 * reducers and route handlers import this; client surfaces live in
 * src/components/minigames/registry.tsx.
 */
import type { MinigameKind, MinigameServer } from "./types";
import { stubGame } from "./stub/server";
import { triviaGame } from "./trivia/server";
import { wordLockGame } from "./wordlock/server";

export const MINIGAMES: Record<MinigameKind, MinigameServer> = {
  stub: stubGame as MinigameServer,
  trivia: triviaGame as MinigameServer,
  wordlock: wordLockGame as MinigameServer,
};

export function poolFor(
  env: "development" | "test" | "production",
): MinigameKind[] {
  const kinds = Object.keys(MINIGAMES) as MinigameKind[];
  // The test pool admits every registered kind, devOnly included: E2E picks
  // the kind it wants explicitly in the create form, so a spec that needs the
  // deterministic stub says so and the trivia spec can draw a real round. It
  // stays a widening only — JUMBO_TEST_MINIGAME_POOL is never set in Vercel.
  if (env === "test") return kinds;
  return kinds.filter(
    (kind) => env !== "production" || !MINIGAMES[kind].devOnly,
  );
}
