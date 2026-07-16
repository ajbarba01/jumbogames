/**
 * Server-side minigame registry: kind → server half + metadata. No React —
 * reducers and route handlers import this; client surfaces live in
 * src/components/minigames/registry.tsx.
 */
import type { MinigameKind, MinigameServer } from "./types";
import { stubGame } from "./stub/server";

export const MINIGAMES: Record<MinigameKind, MinigameServer> = {
  stub: stubGame as MinigameServer,
};

export function poolFor(
  env: "development" | "test" | "production",
): MinigameKind[] {
  return (Object.keys(MINIGAMES) as MinigameKind[]).filter(
    (kind) => env !== "production" || !MINIGAMES[kind].devOnly,
  );
}
