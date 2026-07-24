/**
 * Server-side minigame registry: kind → server half + metadata. No React —
 * reducers and route handlers import this; client surfaces live in
 * src/components/minigames/registry.tsx.
 */
import type { MinigameKind, MinigameServer } from "./types";
import { stubGame } from "./stub/server";
import { triviaGame } from "./trivia/server";

export const MINIGAMES: Record<MinigameKind, MinigameServer> = {
  stub: stubGame as MinigameServer,
  trivia: triviaGame as MinigameServer,
};

export function poolFor(
  env: "development" | "test" | "production",
): MinigameKind[] {
  const kinds = Object.keys(MINIGAMES) as MinigameKind[];
  // The test pool only ever draws devOnly kinds — E2E rounds must land on
  // the deterministic stub, and CI's database carries no question content.
  if (env === "test") return kinds.filter((kind) => MINIGAMES[kind].devOnly);
  return kinds.filter(
    (kind) => env !== "production" || !MINIGAMES[kind].devOnly,
  );
}
