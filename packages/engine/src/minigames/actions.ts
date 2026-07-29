/**
 * Per-kind Zod action schemas — the validation half of the minigame contract.
 * The action route validates the request body against the acting slot's kind
 * before the reducer ever sees it. Adding a game is one entry here.
 */
import { z } from "zod";
import type { MinigameKind } from "./types";
import { MAX_SIDE, MAX_WORD_LENGTH, MIN_WORD_LENGTH } from "./wordlock/tuning";

const stubAction = z.object({ type: z.literal("mash") });

const triviaAction = z.object({
  type: z.literal("answer"),
  deckIndex: z.number().int().min(0),
  choiceIndex: z.number().int().min(0).max(3),
});

const wordLockAction = z.object({
  type: z.literal("submit"),
  path: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(MAX_SIDE * MAX_SIDE - 1),
    )
    .min(MIN_WORD_LENGTH)
    .max(MAX_WORD_LENGTH),
});

const ACTION_SCHEMAS: Record<MinigameKind, z.ZodType> = {
  stub: stubAction,
  trivia: triviaAction,
  wordlock: wordLockAction,
};

export function actionSchemaFor(kind: MinigameKind): z.ZodType {
  return ACTION_SCHEMAS[kind];
}
