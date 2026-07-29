/**
 * The Word Lock gate demo's script: a pure timeline of the three things a
 * player must know before their first trace and cannot learn from the
 * instructions text alone — a traced path claims tiles, a longer word running
 * through a claimed word takes it and scatters the rest back to neutral, and
 * dead tiles reroll on their own. Kept apart from the component so the
 * sequence is unit-testable and Demo.tsx is a bare render loop.
 *
 * Each beat carries the tiles it acts on: the word being traced for
 * `capture` and `break`, and the tiles rerolling on their own for `refresh`
 * (which traces nothing, so its `word` is empty). Both beats run on the same
 * small fixed 5x5 board so the middle beat can start from where the first
 * one left off — `GRAPE` crosses `CAT` at the shared `A`, which is what lets
 * the demo show a real take-and-scatter rather than an unrelated second word.
 */

export type DemoBeatKind = "capture" | "break" | "refresh";

export interface DemoBeat {
  kind: DemoBeatKind;
  durationMs: number;
  /** Tiles the beat acts on: the traced path, or the tiles that reroll. */
  path: number[];
  /** The word traced, or "" for `refresh`, which traces nothing. */
  word: string;
}

export const DEMO_BEATS: readonly DemoBeat[] = [
  { kind: "capture", durationMs: 3200, path: [7, 12, 17], word: "CAT" },
  {
    kind: "break",
    durationMs: 4200,
    path: [10, 11, 12, 13, 14],
    word: "GRAPE",
  },
  { kind: "refresh", durationMs: 2600, path: [7, 17], word: "" },
];

const TOTAL_MS = DEMO_BEATS.reduce((sum, beat) => sum + beat.durationMs, 0);

/**
 * The beat playing at `elapsedMs`, plus how far into it the clock is (`t` in
 * `[0, 1)`). Exported alongside `beatAt` because Demo.tsx needs the fraction
 * to animate a beat's own reveal, not just which beat is current.
 */
export function beatProgressAt(elapsedMs: number): {
  beat: DemoBeat;
  t: number;
} {
  const wrapped = ((elapsedMs % TOTAL_MS) + TOTAL_MS) % TOTAL_MS;
  let start = 0;
  for (const beat of DEMO_BEATS) {
    const end = start + beat.durationMs;
    if (wrapped < end) return { beat, t: (wrapped - start) / beat.durationMs };
    start = end;
  }
  // Unreachable while TOTAL_MS sums the same durations this loop walks, kept
  // only so the function is total over its declared return type.
  const last = DEMO_BEATS[DEMO_BEATS.length - 1]!;
  return { beat: last, t: 1 };
}

/** The beat playing at `elapsedMs`, wrapping modulo the loop's total. */
export function beatAt(elapsedMs: number): DemoBeat {
  return beatProgressAt(elapsedMs).beat;
}
