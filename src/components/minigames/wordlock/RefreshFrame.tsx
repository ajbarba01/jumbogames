/**
 * One tile's countdown to its next dead-space reroll, drawn as a thin frame
 * just inside the tile's edges that drains away as the boundary approaches:
 * full at the start of a window, gone at the reroll, so how much line is left
 * is how much time is left. Only a tile `advanceRefresh` will actually touch
 * at the next boundary gets one at all — a countdown on a tile that will not
 * change would be a false promise, so the frame's mere presence is itself the
 * signal (`Grid` skips rendering this component entirely for a tile that does
 * not qualify). `willRefresh` mirrors that server-side predicate exactly
 * rather than re-deriving it, so the client's "will this reroll" story never
 * drifts from the rule that actually governs the reroll.
 *
 * Progress is one shared number for every frame on the board — every
 * qualifying tile rerolls on the same boundary — computed once by the caller
 * from the server-corrected clock and passed down, so a board of up to 576
 * tiles costs one arithmetic expression per render rather than 576 idle
 * timers.
 *
 * A frame rather than a fill: it stays clear of the letter at the tile's
 * centre instead of washing over it, and it holds its shape at every board
 * scale, where a proportional bar becomes a hairline on a big board and a
 * slab on a small one.
 */
"use client";

/** How far inside the tile's edges the frame sits, as a fraction of the cell.
 *  Clear of the tile's own outline, which is drawn on the boundary itself. */
const INSET_FRAC = 0.11;

/** The frame's line weight, as a fraction of the cell. */
const LINE_FRAC = 0.05;

/**
 * Whether a tile will reroll at the next refresh boundary: neutral now (no
 * owner) and already neutral at the previous tick. `owner` is `-1` for an
 * unclaimed tile (the same convention `tileOwnerIndex` uses); `staleChar` is
 * the tile's own character out of `WordLockView.stale`.
 */
export function willRefresh(
  owner: number,
  staleChar: string | undefined,
): boolean {
  return owner === -1 && staleChar === "1";
}

export function RefreshFrame({
  x,
  y,
  cell,
  progress,
}: {
  /** The tile's top-left corner, in the board's own SVG units. */
  x: number;
  y: number;
  /** Tile side length, in the same units as `x`/`y`. */
  cell: number;
  /** 0 (a boundary just passed) to 1 (about to reroll). */
  progress: number;
}): React.JSX.Element {
  const remaining = 1 - Math.max(0, Math.min(1, progress));
  const inset = cell * INSET_FRAC;
  const left = x + inset;
  const top = y + inset;
  const span = cell - inset * 2;
  // An explicit path rather than a <rect> with `pathLength`: normalising a
  // dash pattern against a declared path length is only dependable on <path>,
  // and the whole effect is one dash — `remaining` of the perimeter drawn,
  // the rest gapped — so the perimeter has to measure exactly 1.
  const perimeter = `M${left} ${top} H${left + span} V${top + span} H${left} Z`;
  return (
    <path
      d={perimeter}
      fill="none"
      pathLength={1}
      strokeDasharray={`${remaining} 1`}
      strokeWidth={cell * LINE_FRAC}
      className="stroke-s12/30"
      style={{ pointerEvents: "none" }}
    />
  );
}
