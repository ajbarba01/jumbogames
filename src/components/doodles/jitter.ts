/**
 * Pure frame derivation for the background doodle boil: perturbs an SVG path's
 * coordinates by a seeded offset, so one authored path yields the
 * slightly-redrawn variants a stop-motion boil cycles through.
 */

/** mulberry32 — small, fast, and adequately distributed for decoration. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every number in these paths is a coordinate. That holds only because the
// doodle set uses M/L/C/S/Z exclusively — an arc's flag arguments are numbers
// that are not coordinates, and displacing one would corrupt the path.
const COORDINATE = /-?\d+(?:\.\d+)?/g;

export function jitterPath(d: string, amplitude: number, seed: number): string {
  const next = seededRandom(seed);
  return d.replace(COORDINATE, (raw) => {
    const shifted = Number(raw) + (next() * 2 - 1) * amplitude;
    return String(Math.round(shifted * 100) / 100);
  });
}

/**
 * Frame zero is the authored path untouched: reduced motion pins the first
 * frame, and what a reader sees at rest should be the drawing as drawn.
 */
export function jitterFrames(
  d: string,
  amplitude: number,
  seed: number,
  frames: number,
): string[] {
  return Array.from({ length: frames }, (_, i) =>
    i === 0 ? d : jitterPath(d, amplitude, seed + i),
  );
}
