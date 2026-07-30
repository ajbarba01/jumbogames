/**
 * A captured word drawn as a rounded capsule chain through its tiles' centers.
 * Outlining the union of the tiles fails for diagonal steps, which touch only
 * at a corner and produce a disconnected staircase; a chain makes a diagonal
 * merely a rotated segment, and the chain's length reads as the word's length,
 * which is the number that decides whether anyone can take it back.
 *
 * A one-tile path is drawn as a dot rather than as nothing: the first tile of
 * a trace is a real, committed choice by the player, and a chain that only
 * appears on the second tile reads as the first press having missed. A
 * polyline with a single point paints nothing whatever its linecap, so the
 * point is emitted twice — a zero-length segment, which a round cap renders
 * as the dot.
 *
 * `pointerEvents: "none"` lives on the polyline itself, not on each caller's
 * wrapping group: every board that draws a Snake — the live grid, its
 * in-progress trace, the blocked-word flash, the gate demo — needs the same
 * guarantee that the chain never intercepts a pointer event meant for the
 * tile underneath it, so the component owns it rather than trusting every
 * call site to remember.
 */
"use client";

export function Snake({
  path,
  side,
  cell,
  className,
}: {
  path: number[];
  side: number;
  cell: number;
  className?: string;
}): React.JSX.Element {
  const center = (tile: number): { x: number; y: number } => ({
    x: ((tile % side) + 0.5) * cell,
    y: (Math.floor(tile / side) + 0.5) * cell,
  });
  const drawn = path.length === 1 ? [path[0]!, path[0]!] : path;
  const points = drawn
    .map((tile) => {
      const { x, y } = center(tile);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <polyline
      className={className}
      points={points}
      fill="none"
      strokeWidth={cell * 0.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pointerEvents: "none" }}
    />
  );
}
