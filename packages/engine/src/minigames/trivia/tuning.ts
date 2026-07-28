/**
 * Every Tug O' Lore tuning constant in one table, so a retune is a single
 * commit with no logic edits. The ladder is derived from an estimated 4.2s
 * (expert) to 9.2s (weak) per correct answer per player — the weakest number
 * in the design, and the one a real playtest should replace with measurements.
 */

/** Highest reachable pulling-power tier. */
export const MAX_TIER = 5;

/**
 * The floor. Demotion stops here, so a team that climbed and then stalled ends
 * level with one that never answered at all.
 *
 * It was 0, with an idle team left permanently unstarted at tier 1. That
 * inverted the whole mechanic: a team that never touched a card kept tier 1's
 * force forever, while a team that tried and fell behind decayed past them to
 * 0 — participating was strictly worse than doing nothing. Flooring at 1
 * removes the asymmetry without needing an idle team's timer to run.
 */
export const MIN_TIER = 1;

/**
 * Normalized charge required to climb one tier. A correct answer contributes
 * 1/teamSize, so a tier costs the same per-player effort at every team size.
 *
 * Was 3, which made the ladder harder than its own calibration: holding tier 3
 * demanded an answer every 6.3s against an estimated *average* of 6.6s, so the
 * average team topped out at tier 2 and tier 5 was effectively unreachable.
 */
export const CHARGE_PER_TIER = 2;

/**
 * Seconds a team may hold each tier before it demotes, indexed by tier. The
 * ladder shrinks upward so a high tier is somewhere you visit, not somewhere
 * you live. Tiers at or below MIN_TIER never expire — the leading infinities
 * are what express the floor in data, alongside the explicit bound in tiers.ts.
 *
 * Holding tier T requires one answer per player every
 * TIER_SECONDS[T] / CHARGE_PER_TIER seconds — 11.5s at tier 2 down to 6.5s at
 * tier 5. Against the estimated 4.2s (expert) to 9.2s (weak) per answer, that
 * puts the average 6.6s player at tier 3-4 and leaves 5 as a brief peak.
 */
export const TIER_SECONDS: readonly number[] = [
  Number.POSITIVE_INFINITY,
  Number.POSITIVE_INFINITY,
  23,
  19,
  16,
  13,
];

/**
 * Fraction of accumulated charge kept through a demotion. Full carry was
 * modelled and rejected: a demoted team arrives holding nearly enough to
 * re-promote within ~3s, which turns demotion into a flutter and inflates
 * every team's effective tier.
 */
export const DEMOTION_KEEP = 0.5;

/**
 * Rope sensitivity divisor: k = sqrt(meanTeamSize) / ROPE_DIVISOR, in rope
 * units per second per tier of gap. Lower it to make pins easier at every team
 * size — this is the only knob that should move for that reason. The sqrt is
 * the shape of the team-size correction, not a difficulty knob.
 */
export const ROPE_DIVISOR = 175;

/** |p| below this at expiry is a dead heat and defers to the score means. */
export const TIE_EPSILON = 0.01;

/** How long a wrong answer locks a player's choices. */
export const LOCKOUT_MS = 3000;

/**
 * Cards dealt into a match. Raised from 150 because dump-to-skip consumes the
 * deck 2-3x faster: a team that laps the deck starts drawing repeats, and a
 * repeat is a free charge. The cap bounds the deck snapshotted into the slot's
 * persisted payload JSON — redact never ships the deck to a client, so this is
 * a database-row cost, not bandwidth.
 */
export const DECK_CAP = 500;
