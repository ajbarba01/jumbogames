/**
 * Word Lock's gate demo: a looping, non-interactive run through the three
 * things a player must know before their first trace, staged on a small
 * fixed board by the pure script in demo-script.ts. The board and the chain
 * are hand-drawn tiles plus the shipping Snake, unmodified — only the beat
 * they are asked to draw is staged.
 *
 * This also owns the one mount-time fetch of the hint dictionary
 * (`preloadHintDictionary`): the gate is the only screen guaranteed to show
 * before a Word Lock match starts and the only one guaranteed never to show
 * for a match that isn't Word Lock, so it is the correct — and only — place
 * to spend the word list's ~1.5 MB before play needs it.
 *
 * The band is one picture. It is `role="img"` with a summary label rather
 * than a tree of readable text, matching Tug O' Lore's demo: a screen-reader
 * user gets the rules from the instructions text beside it, not from a
 * decoration replaying itself on a loop.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cx } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";
import { Snake } from "./Snake";
import { preloadHintDictionary } from "./use-hint-dictionary";
import { beatProgressAt, type DemoBeat } from "./demo-script";

const SIDE = 5;
const CELL = 40;

/** Matches Grid.tsx's tile tint: the team hue mixed into the neutral ground
 *  rather than shown at full strength, so the letter painted on top stays
 *  legible for either team colour instead of the chain (and, previously, the
 *  solid fill) erasing it. Governs only the flat tile fill visible where the
 *  chain doesn't cover it; see `LETTER_HALO_FRAC` for what protects the
 *  glyph against the chain itself. */
const TILE_TINT_PCT = 30;

/** Matches Grid.tsx's letter outline: see that file's `LETTER_HALO_FRAC` for
 *  the measured contrast this is based on. */
const LETTER_HALO_FRAC = 0.125;

/**
 * The fixed board's resting letters. `GRAPE` (row 3) already spells the
 * break beat's word, and its middle `A` is `CAT`'s own middle letter — the
 * same tile — which is what lets the break beat show a real crossing rather
 * than two words that happen to share the screen.
 */
const LETTERS = "SOLVEBICKDGRAPEFUTNYHMJXZ";

/** First half of a beat draws its chain; the rest holds the result. */
const DRAW_FRACTION = 0.5;

/** The single frame reduced motion pins to: the break beat's payoff, where
 *  a captured word has just been taken and its leftover tiles have scattered
 *  back to neutral — the one frame that shows a result rather than a hand
 *  mid-trace. */
const STILL_MS = 6400;

const CAPTIONS: Record<DemoBeat["kind"], string> = {
  capture: "Trace three or more letters to claim a word for your team.",
  break:
    "A longer word crossing a claimed word takes it — the rest scatters " +
    "back to neutral.",
  refresh: "Unclaimed tiles reroll their letters if nobody uses them.",
};

/** A tile's letter reroll mid-flicker, landing on its final letter by the
 *  time the refresh beat is two-thirds done. */
const REROLL_SEQUENCES: Record<number, readonly string[]> = {
  7: ["C", "Q", "M"],
  17: ["T", "J", "Z"],
};

interface DemoFrame {
  owners: Partial<Record<number, "A" | "B">>;
  letters: Partial<Record<number, string>>;
  chain: { path: number[]; side: "A" | "B" | "tracing" } | null;
  caption: string;
}

function revealedPrefix(path: readonly number[], t: number): number[] {
  const count = Math.max(
    1,
    Math.min(path.length, Math.ceil((t / DRAW_FRACTION) * path.length)),
  );
  return path.slice(0, count);
}

function ownersFor(
  tiles: readonly number[],
  side: "A" | "B",
): DemoFrame["owners"] {
  const owners: DemoFrame["owners"] = {};
  for (const tile of tiles) owners[tile] = side;
  return owners;
}

/** Every fact this beat draws, as a pure function of its own progress. The
 *  three beats are staged independently rather than accumulated from one
 *  another: each states the board it needs, including the parts a real
 *  match would have carried over from the beat before it. */
function frameAt(beat: DemoBeat, t: number): DemoFrame {
  const caption = CAPTIONS[beat.kind];

  if (beat.kind === "capture") {
    if (t < DRAW_FRACTION) {
      return {
        owners: {},
        letters: {},
        chain: { path: revealedPrefix(beat.path, t), side: "tracing" },
        caption,
      };
    }
    return {
      owners: ownersFor(beat.path, "A"),
      letters: {},
      chain: { path: beat.path, side: "A" },
      caption,
    };
  }

  if (beat.kind === "break") {
    // CAT, held from the capture beat: the word the break is about to take.
    const held = ownersFor([7, 12, 17], "A");
    if (t < DRAW_FRACTION) {
      return {
        owners: held,
        letters: {},
        chain: { path: revealedPrefix(beat.path, t), side: "tracing" },
        caption,
      };
    }
    // The take: GRAPE's tiles pass to B, and CAT's leftover tiles — the ones
    // GRAPE didn't cross — scatter back to neutral by simply not appearing
    // in the new owner map at all.
    return {
      owners: ownersFor(beat.path, "B"),
      letters: {},
      chain: { path: beat.path, side: "B" },
      caption,
    };
  }

  // refresh: GRAPE stays held from the break beat; its own job is the
  // reroll flicker on the two tiles that scattered.
  const held = ownersFor([10, 11, 12, 13, 14], "B");
  const step = Math.min(2, Math.floor((t / (2 / 3)) * 3));
  const letters: DemoFrame["letters"] = {};
  for (const tile of beat.path) {
    const sequence = REROLL_SEQUENCES[tile];
    if (sequence !== undefined) letters[tile] = sequence[step];
  }
  return { owners: held, letters, chain: null, caption };
}

function ownerColorVar(
  side: "A" | "B",
  teamA: MatchTeam,
  teamB: MatchTeam,
): string {
  return `var(--color-team-${side === "A" ? teamA.colorIndex : teamB.colorIndex})`;
}

function ownerTintVar(
  side: "A" | "B",
  teamA: MatchTeam,
  teamB: MatchTeam,
): string {
  const color = ownerColorVar(side, teamA, teamB);
  return `color-mix(in srgb, ${color} ${TILE_TINT_PCT}%, var(--color-s4) ${
    100 - TILE_TINT_PCT
  }%)`;
}

/** The demo's own clock: elapsed ms into the loop, off `requestAnimationFrame`
 *  rather than the display's own rate — this is decoration under a gate
 *  screen whose real job is collecting ready checks, and it drives itself
 *  because nothing is live to drive it. Reduced motion pins the authored
 *  still frame and never starts the loop. */
function useDemoClock(): number {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const tick = (time: number) => {
      startedAt.current ??= time;
      setElapsed(time - startedAt.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return reduced ? STILL_MS : elapsed;
}

export function WordLockDemo({
  teamA,
  teamB,
}: {
  teamA: MatchTeam;
  teamB: MatchTeam;
}): React.JSX.Element {
  useEffect(() => {
    preloadHintDictionary();
  }, []);

  const elapsed = useDemoClock();
  const { beat, t } = beatProgressAt(elapsed);
  const frame = frameAt(beat, t);
  const boardPx = SIDE * CELL;

  return (
    <div
      role="img"
      aria-label="Demonstration: tracing three or more letters claims a word for your team. A longer word crossing a claimed word takes it and scatters the rest back to neutral. Unclaimed tiles reroll if nobody uses them."
      className="flex w-full max-w-xs flex-col items-center gap-3"
    >
      <svg viewBox={`0 0 ${boardPx} ${boardPx}`} className="w-full select-none">
        {/* Pass 1: tile rects. */}
        {Array.from({ length: SIDE * SIDE }, (_, tile) => {
          const owner = frame.owners[tile] ?? null;
          const x = (tile % SIDE) * CELL;
          const y = Math.floor(tile / SIDE) * CELL;
          return (
            <rect
              key={tile}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              className={cx("stroke-s6", owner === null && "fill-s4")}
              style={
                owner !== null
                  ? { fill: ownerTintVar(owner, teamA, teamB) }
                  : undefined
              }
              strokeWidth={2}
            />
          );
        })}
        {/* Pass 2: the chain, painted before letters so a captured word's
            letters stay readable underneath it — the same fix as Grid.tsx,
            since this band hand-rolls its own tiles rather than reusing
            Grid's markup. */}
        {frame.chain !== null && (
          <g
            style={
              frame.chain.side === "tracing"
                ? undefined
                : { stroke: ownerColorVar(frame.chain.side, teamA, teamB) }
            }
          >
            <Snake
              path={frame.chain.path}
              side={SIDE}
              cell={CELL}
              className={frame.chain.side === "tracing" ? "stroke-s10" : ""}
            />
          </g>
        )}
        {/* Pass 3: letters, painted last and haloed, same as Grid.tsx. */}
        {Array.from({ length: SIDE * SIDE }, (_, tile) => {
          const x = (tile % SIDE) * CELL;
          const y = Math.floor(tile / SIDE) * CELL;
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
              className="fill-s12 font-sans font-bold"
            >
              {frame.letters[tile] ?? LETTERS[tile]}
            </text>
          );
        })}
      </svg>
      <p className="text-center text-sec font-bold text-balance text-s11">
        {frame.caption}
      </p>
    </div>
  );
}
