/**
 * The shared Word Lock board: one SVG whose tiles carry ownership colour and
 * their letter, a per-tile refresh countdown frame, a Snake per live word, and
 * a Snake for the trace in progress. Painted in passes — tile rects (with
 * their refresh frames), then every Snake, then every letter — so a captured
 * tile's letter always sits on top of the chain running through it instead of
 * underneath it. Paint order alone is not enough, though: a live word's Snake
 * and the in-progress trace both stroke at full saturation directly under a
 * letter's glyph, and no single flat letter colour clears readable contrast
 * against every team hue plus the trace's own colours. Each letter therefore
 * carries a dark outline (`paintOrder="stroke"`) rather than a flat fill — a
 * halo, not a colour choice, so legibility no longer depends on what happens
 * to be painted underneath. The board is scaled to whatever square its
 * container can give it — up as readily as down, since a grid nobody can read
 * across a room is the more likely failure — measured live via
 * `ResizeObserver` rather than once on mount, so it stays centred and fully
 * visible as the viewport or the surrounding HUD chrome changes size. Because
 * the whole board always fits, there is nothing to pan or zoom to; `CELL` is
 * now only the unit the viewBox is expressed in, not a pixel size on screen.
 */
"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cx } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";
import { tileOwnerIndex } from "@jumbo/engine";
import type { WordLockReject, WordLockView } from "@jumbo/engine";
import { RefreshFrame, willRefresh } from "./RefreshFrame";
import { Snake } from "./Snake";

/** Side of one tile in the board's own viewBox units. Every other length here
 *  is a fraction of it, so the whole board scales with the square the layout
 *  hands it and this number never has to be a pixel size on screen. */
const CELL = 44;

/** Width of a tile's outline, in the same units. The outline is inset by half
 *  of this so it lies wholly inside its own cell: two tiles sharing a stroke
 *  centred on the boundary means the later-painted tile overdraws its
 *  neighbour's right and bottom edges, which left a hover highlight visible
 *  only along the two edges nothing else painted over. */
const TILE_STROKE = 2;

/**
 * Radius (as a fraction of `CELL`) of the dead circle around each corner of
 * the grid, inside which a drag extends onto nothing. A drag from one tile to
 * its diagonal neighbour has to pass through the corner they share, clipping
 * the two orthogonal tiles that share it too; without this a diagonal read as
 * an L almost every time. Excluding just the corners is what makes that safe
 * while leaving the rest of every tile live: the previous rule — extend only
 * within a radius of a tile's *centre* — left an unreachable band around the
 * whole outside of each tile, and a drag angled to stay inside that band
 * (anything shallow, or along a row of edges) extended onto nothing at all.
 * Since `extendPath` then refuses the next tile for not being adjacent to a
 * tail the drag has long since left behind, the trace stopped following the
 * finger entirely. Tolerance to a sloppy diagonal is comparable either way:
 * this admits a bow of about 0.25 of a cell off the true diagonal, against
 * 0.23 for the centre radius it replaces.
 */
const CORNER_DEADZONE_FRAC = 0.35;

/** How finely the segment between two pointer events is sampled, as a
 *  fraction of `CELL`. Well under half a cell, so no tile the segment crosses
 *  can fall between two samples. */
const SAMPLE_FRAC = 0.25;

/**
 * Portion of the tile fill spent on the owning team's hue. Tuned against all
 * 15 team colours mixed into the neutral tile ground (`--color-s4`): at this
 * ratio every one keeps at least a 5.48:1 contrast against the cream letter
 * fill. This governs only the flat tile fill visible where no Snake covers
 * it — a live word's own tiles are mostly covered by its Snake at full
 * saturation, which is what the letter's outline (below) exists to survive.
 */
const TILE_TINT_PCT = 30;

/**
 * A letter's outline width, as a fraction of `CELL`. `paintOrder="stroke"`
 * draws this dark ring before the letter's fill, so the fill covers its
 * interior and only a halo shows at the edges — legible against any
 * backdrop, not just the ones a flat fill colour was checked against.
 * Verified against all 15 full-saturation team colours (the Snake's own
 * stroke colour) plus both in-progress trace colours (`stroke-s10`,
 * `stroke-ok`): the ring's outer edge (`--color-s1` against the backdrop)
 * clears 4.5:1 in every case but one (team 3, at 4.54:1, still just over),
 * and its inner edge (`--color-s1` against the `fill-s12` glyph) is a
 * constant 16.98:1 regardless of backdrop — the double edge is what makes a
 * single flat-colour contrast number the wrong way to reason about this.
 */
const LETTER_HALO_FRAC = 0.125;

/**
 * Duration of the blocked-word flash's opacity pulse. Not one of the kit's
 * four named Thunk durations — like `WinGlow`'s swell and `Rope`'s physics,
 * this is a one-off game-beat cue rather than chrome motion, so it keeps its
 * own constant instead of borrowing a token whose meaning doesn't fit.
 */
const FLASH_DUR = 0.8;

function teamColorVar(
  side: "A" | "B",
  teamA: MatchTeam,
  teamB: MatchTeam,
): string {
  return `var(--color-team-${side === "A" ? teamA.colorIndex : teamB.colorIndex})`;
}

/** A captured tile's fill: the team's hue tinted into the neutral ground so
 *  the letter painted on top of it stays legible for every colour in the
 *  team palette, not just a colour that happens to already be light. */
function tileTintVar(
  side: "A" | "B",
  teamA: MatchTeam,
  teamB: MatchTeam,
): string {
  return `color-mix(in srgb, ${teamColorVar(side, teamA, teamB)} ${TILE_TINT_PCT}%, var(--color-s4) ${100 - TILE_TINT_PCT}%)`;
}

export function Grid({
  view,
  teamA,
  teamB,
  path,
  traceValid,
  flashTiles,
  refreshProgress,
  onTileDown,
  onTileEnter,
  onRelease,
}: {
  view: WordLockView;
  teamA: MatchTeam;
  teamB: MatchTeam;
  path: number[];
  traceValid: boolean;
  flashTiles: WordLockReject | null;
  /** Progress toward the next dead-space reroll, 0 to 1, shared by every
   *  qualifying tile since they all reroll on the same boundary. */
  refreshProgress: number;
  onTileDown: (tile: number) => void;
  onTileEnter: (tile: number) => void;
  onRelease: () => void;
}): React.JSX.Element {
  const sizerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boardPx = view.side * CELL;
  const [fitSize, setFitSize] = useState<number | null>(null);

  // Fit the board to whatever space the sizer actually has, recomputed on
  // every resize of that space rather than once on mount. A `resize` listener
  // on `window` would miss a change driven purely by layout — the HUD above
  // this board growing or shrinking a line — so this watches the sizer
  // itself. `min-w-0`/`min-h-0` on the sizer (below) keep its own box
  // determined by the surrounding flex layout rather than by this board's
  // content, which is what makes it a trustworthy measurement of "space
  // available" independent of what gets rendered inside it. Deliberately not
  // capped at the board's natural size: the tiles grow to use the room they
  // are given rather than leaving a small board marooned in a large space.
  useEffect(() => {
    const sizer = sizerRef.current;
    if (sizer === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const { width, height } = entry.contentRect;
      setFitSize(Math.max(0, Math.min(width, height)));
    });
    observer.observe(sizer);
    return () => observer.disconnect();
  }, []);

  // A release outside the board — the drag ending off the SVG entirely — must
  // still commit the trace, so the listener lives on window, not the board.
  useEffect(() => {
    window.addEventListener("pointerup", onRelease);
    return () => window.removeEventListener("pointerup", onRelease);
  }, [onRelease]);

  const owners = tileOwnerIndex(view.words, view.side * view.side);
  const flashBy = flashTiles?.blockedBy ?? null;
  const flashWord =
    flashBy !== null && flashBy.length > 0
      ? (view.words[owners[flashBy[0]!]!] ?? null)
      : null;

  const renderedSize = fitSize ?? boardPx;

  /** Extend onto whatever tile a single board-space point falls in, unless
   *  that point is inside a corner deadzone (see `CORNER_DEADZONE_FRAC`).
   *  `onTileEnter` itself gates on whether a drag is active and ignores a
   *  tile the path cannot legally take, so this can run for every sample. */
  const extendAt = (x: number, y: number): void => {
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    if (col < 0 || col >= view.side || row < 0 || row >= view.side) return;
    // The nearest lattice corner is the nearest gridline crossing in each
    // axis, which is what rounding to a whole number of cells gives.
    const dx = x - Math.round(x / CELL) * CELL;
    const dy = y - Math.round(y / CELL) * CELL;
    if (Math.hypot(dx, dy) < CORNER_DEADZONE_FRAC * CELL) return;
    onTileEnter(row * view.side + col);
  };

  // Hit-test the pointer's whole route since the last event, not just where
  // it happens to be now. A pointermove reports where the pointer landed, not
  // the line it took to get there, so a quick drag skips tiles outright — and
  // a skipped tile is not a cosmetic miss: `extendPath` refuses a tile that
  // is not adjacent to the path's tail, so the trace stops following the
  // finger from then on and only a backtrack recovers it. Sampling the
  // segment closes that, with no ceiling on how far apart two events may be:
  // a capped one strands exactly the fast flick this exists to rescue. The
  // only jumps that must not be joined up are the ones the pointer did not
  // travel — a press starting a new gesture, and a re-entry after leaving the
  // board — and each of those clears the anchor at the source (below) rather
  // than being guessed at from a distance.
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  /** A pointer event's position in board (viewBox) units, or null if the
   *  board has no box to measure against yet. */
  const toBoard = (event: {
    clientX: number;
    clientY: number;
  }): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const bounds = svg.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return null;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * boardPx,
      y: ((event.clientY - bounds.top) / bounds.height) * boardPx,
    };
  };

  const handlePointerMove = (
    event: React.PointerEvent<SVGSVGElement>,
  ): void => {
    const point = toBoard(event);
    if (point === null) return;
    const { x, y } = point;
    const previous = lastPointRef.current;
    lastPointRef.current = point;

    if (previous === null) {
      extendAt(x, y);
      return;
    }
    const travelled = Math.hypot(x - previous.x, y - previous.y);
    const steps = Math.max(1, Math.ceil(travelled / (SAMPLE_FRAC * CELL)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      extendAt(
        previous.x + (x - previous.x) * t,
        previous.y + (y - previous.y) * t,
      );
    }
  };

  return (
    <div
      ref={sizerRef}
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
    >
      {/* The border sits on the SVG itself rather than on a wrapper sized to
          match it: a wrapper's border-box ate two pixels of the square the
          board had been given, so the board overflowed it and the browser
          answered with scrollbars. One element, one box, nothing to scroll. */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${boardPx} ${boardPx}`}
        width={renderedSize}
        height={renderedSize}
        className="border-2 border-s6 bg-s1 select-none"
        onPointerMove={handlePointerMove}
        // Leaving the board ends the route: whatever the pointer did out
        // there is not a line across tiles, so a re-entry starts a new one.
        onPointerLeave={() => {
          lastPointRef.current = null;
        }}
      >
        {/* Pass 1: tile fills, each with its own refresh frame and outline on
            top. These rects are the pointerdown target, so they must be the
            bottom layer — a Snake or letter painted first (and thus visually
            or pointer-wise on top) would sit between the finger and the tile
            it is meant to hit. A qualifying tile's frame paints directly after
            its fill and before every other pass, so it never covers a Snake
            or a letter. The outline is a second rect rather than a stroke on
            the fill so it can be inset (see `TILE_STROKE`) and pointer-
            transparent; hover lives on the group, so pointing anywhere in
            the tile lights all four of its edges. */}
        {Array.from({ length: view.side * view.side }, (_, tile) => {
          const owner = owners[tile]!;
          const word = owner === -1 ? null : (view.words[owner] ?? null);
          const x = (tile % view.side) * CELL;
          const y = Math.floor(tile / view.side) * CELL;
          return (
            <g key={tile} className="group">
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                className={cx(word === null && "fill-s4")}
                style={
                  word !== null
                    ? { fill: tileTintVar(word.side, teamA, teamB) }
                    : undefined
                }
                onPointerDown={(event) => {
                  // A touch pointerdown implicitly captures the pointer to
                  // this rect (Pointer Events spec), which would then
                  // confine every later pointermove to this element alone
                  // — the drag would never reach a second tile, capping
                  // every traced path at length 1 on touch while behaving
                  // perfectly under a mouse. Releasing it immediately hands
                  // pointer tracking back to the SVG, which is where the
                  // move handler above lives. Feature-detected (jsdom has
                  // neither method) and guarded (some engines throw if this
                  // pointer was never actually captured).
                  // A press starts a fresh route, anchored where it landed.
                  // Anchoring matters as much as resetting: a touch reports
                  // no moves at all between gestures, so without this its
                  // first move would be joined to wherever the last gesture
                  // ended — and with no anchor at all, a fast first move
                  // would have nothing to interpolate from and would strand
                  // the trace on tile one.
                  lastPointRef.current = toBoard(event);
                  const target = event.currentTarget;
                  if (typeof target.releasePointerCapture === "function") {
                    try {
                      target.releasePointerCapture(event.pointerId);
                    } catch {
                      // No active capture for this pointer id: nothing to
                      // release.
                    }
                  }
                  onTileDown(tile);
                }}
              />
              {willRefresh(owner, view.stale[tile]) && (
                <RefreshFrame
                  x={x}
                  y={y}
                  cell={CELL}
                  progress={refreshProgress}
                />
              )}
              <rect
                x={x + TILE_STROKE / 2}
                y={y + TILE_STROKE / 2}
                width={CELL - TILE_STROKE}
                height={CELL - TILE_STROKE}
                fill="none"
                strokeWidth={TILE_STROKE}
                className="pointer-events-none stroke-s6 group-hover:stroke-s10"
              />
            </g>
          );
        })}
        {/* Pass 2: every Snake — live words, the blocked-word flash, and
              last of all the in-progress trace. Snake itself sets
              `pointerEvents: "none"` on its polyline, which is what lets a
              pointerdown on a captured tile reach the rect underneath instead
              of the chain drawn through it; painting this pass before the
              letters is what keeps a captured tile's letter readable. The
              trace goes last within the pass because it is the thing the
              player is doing right now: a captured chain drawn over it — the
              flash in particular, which repaints a word already drawn below —
              hides the very feedback the drag exists to give. */}
        {view.words.map((word, index) => (
          <g
            key={index}
            style={{ stroke: teamColorVar(word.side, teamA, teamB) }}
          >
            <Snake path={word.path} side={view.side} cell={CELL} />
          </g>
        ))}
        {flashTiles !== null && flashBy !== null && flashWord !== null && (
          <motion.g
            key={flashTiles.at}
            style={{ stroke: teamColorVar(flashWord.side, teamA, teamB) }}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.15, 1, 0.15, 1] }}
            transition={{ duration: FLASH_DUR, ease: "easeInOut" }}
          >
            <Snake path={flashBy} side={view.side} cell={CELL} />
          </motion.g>
        )}
        {/* From the first tile, not the second: Snake draws a one-tile path
            as a dot, so the press that starts a trace is acknowledged. */}
        {path.length >= 1 && (
          <Snake
            path={path}
            side={view.side}
            cell={CELL}
            className={cx(traceValid ? "stroke-ok" : "stroke-s10")}
          />
        )}
        {/* Pass 3: letters, painted last so a chain drawn through a tile —
              captured, in-progress, or flashing — never covers its letter.
              Each glyph also carries its own dark outline (see
              `LETTER_HALO_FRAC`), since paint order alone still leaves a
              flat-fill letter sitting directly on a full-saturation Snake. */}
        {Array.from({ length: view.side * view.side }, (_, tile) => {
          const x = (tile % view.side) * CELL;
          const y = Math.floor(tile / view.side) * CELL;
          return (
            <text
              key={tile}
              x={x + CELL / 2}
              y={y + CELL / 2}
              textAnchor="middle"
              dominantBaseline="central"
              paintOrder="stroke"
              stroke="var(--color-s1)"
              strokeWidth={CELL * LETTER_HALO_FRAC}
              strokeLinejoin="round"
              style={{ fontSize: CELL * 0.45 }}
              className="pointer-events-none fill-s12 font-sans font-bold"
            >
              {view.letters[tile]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
