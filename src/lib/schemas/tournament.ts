/**
 * Zod schemas and shared numeric bounds for tournament and team requests,
 * parsed at the route boundary before any handler logic runs. The caps live
 * here so routes, the color picker, and the start guard agree on one set of
 * numbers.
 */
import { z } from "zod";

export const MAX_TEAMS = 15; // matches the kit's 15-color team palette
export const MIN_TEAMS_TO_START = 2; // a round-robin needs at least one pairing
export const MIN_MINIGAMES_PER_MATCH = 1;
export const MAX_MINIGAMES_PER_MATCH = 4; // size of the minigame pool

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1).max(60),
  minigamesPerMatch: z
    .number()
    .int()
    .min(MIN_MINIGAMES_PER_MATCH)
    .max(MAX_MINIGAMES_PER_MATCH)
    .default(1),
});

// Codes are normalized to uppercase for lookup; the canonical format lives in
// join-code.ts. Bounds here only reject obvious garbage early.
export const joinTournamentSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(12)
    .transform((value) => value.trim().toUpperCase()),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(30),
});

export const readyTeamSchema = z.object({
  ready: z.boolean(),
});

export const startTournamentSchema = z.object({
  override: z.boolean().default(false),
});
