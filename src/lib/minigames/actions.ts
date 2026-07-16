/**
 * Per-kind Zod action schemas — the validation half of the minigame contract.
 * The action route validates the request body against the acting slot's kind
 * before the reducer ever sees it. Adding a game is one entry here.
 */
import { z } from "zod";
import type { MinigameKind } from "./types";

const stubAction = z.object({ type: z.literal("mash") });

const ACTION_SCHEMAS: Record<MinigameKind, z.ZodType> = {
  stub: stubAction,
};

export function actionSchemaFor(kind: MinigameKind): z.ZodType {
  return ACTION_SCHEMAS[kind];
}
