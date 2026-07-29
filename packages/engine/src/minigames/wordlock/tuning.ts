/**
 * Every Word Lock tuning constant in one table, so a retune is a single
 * commit with no logic edits.
 */

/**
 * Tiles per player in the match, both teams combined — a middle ground
 * between constant collision and parallel solitaire.
 */
export const TILES_PER_PLAYER = 25;

/** Keeps a 1v1 from being a Boggle board. */
export const MIN_SIDE = 10;

/** Keeps a runaway 15v15 navigable on a laptop. */
export const MAX_SIDE = 24;

/** Shortest tile path that counts as a word. */
export const MIN_WORD_LENGTH = 3;

/**
 * Longest tile path that counts as a word — longer paths are vanishingly
 * rare and only inflate the blob.
 */
export const MAX_WORD_LENGTH = 12;

/** How often stale neutral tiles reroll. */
export const REFRESH_PERIOD_MS = 20_000;

/**
 * When true a player may play a given word only once per match; off pending
 * a playtest.
 */
export const ONE_PLAY_PER_WORD = false;

/** Length of a Word Lock match. */
export const WORDLOCK_PLAY_SECONDS = 120;

/** Letters that make a region unplayable when they cluster. */
export const RARE_LETTERS = "XZJ";

/** Ceiling on rare letters within any 4x4 block. */
export const MAX_RARE_PER_BLOCK = 2;
