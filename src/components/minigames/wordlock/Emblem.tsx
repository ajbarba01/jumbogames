/**
 * Word Lock's emblem: a fragment of grid with a capsule chain running
 * diagonally through it — the two facts that carry the whole game, drawn
 * before a word of it is read. The chain reuses Snake, the same component
 * that draws a captured word on the real board, so the emblem, the gate
 * demo and play itself are one idea at three sizes rather than three
 * drawings of it.
 *
 * Monochrome by law (docs/UI.md): identity is carried by silhouette, and the
 * mark draws in `currentColor` so it inherits whatever ink its surface uses.
 * Authored in a 48-unit box and scaled by the caller's width/height — no
 * letters and no hairline strokes, so the mark survives the 20px chip.
 */
import { Snake } from "./Snake";

const SIDE = 4;
const CELL = 12;
/** Corner to corner: the longest chain the fragment can show. */
const DIAGONAL = [0, 5, 10, 15];

export function WordLockEmblem({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      {Array.from({ length: SIDE + 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={i * CELL}
          y1={0}
          x2={i * CELL}
          y2={SIDE * CELL}
          stroke="currentColor"
          strokeWidth="3"
        />
      ))}
      {Array.from({ length: SIDE + 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={i * CELL}
          x2={SIDE * CELL}
          y2={i * CELL}
          stroke="currentColor"
          strokeWidth="3"
        />
      ))}
      <Snake
        path={DIAGONAL}
        side={SIDE}
        cell={CELL}
        className="stroke-current"
      />
    </svg>
  );
}
