/**
 * The rope: a braided track with team-colour handles at each wall, a centre
 * tick, and a sticker-chrome knot sliding on p ∈ [−1, +1]. One size for every
 * viewer — the player reads the same rope the projector shows.
 *
 * This is a game-surface indicator, not a kit member, and deliberately so
 * (docs/UI.md): the kit ships no status-indicator components, and a surface
 * designs its own against the status vocabulary. Team colour appears only at
 * the walls, where it is identity; the knot's position is the state, and it
 * carries no status hue at all.
 */
"use client";

import { motion } from "motion/react";
import { SLIP_DUR, SLIP_EASE } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";

export function Rope({
  p,
  teamA,
  teamB,
}: {
  /** Rope position; +1 is team A's wall (the server's convention). */
  p: number;
  teamA: MatchTeam;
  teamB: MatchTeam;
}): React.JSX.Element {
  // A reads on the left, so p = +1 maps to 0%.
  const percent = ((1 - p) / 2) * 100;
  const toward = p === 0 ? null : p > 0 ? teamA.name : teamB.name;
  return (
    <div
      role="img"
      aria-label={
        toward === null ? "Rope at centre" : `Rope pulled toward ${toward}`
      }
      className="relative h-24 w-full"
    >
      <div
        className="absolute inset-x-1 top-1/2 h-6 -translate-y-1/2 rounded-r2"
        style={{
          background:
            "repeating-linear-gradient(45deg, var(--color-s6) 0 8px, var(--color-s7) 8px 16px)",
        }}
        aria-hidden
      />
      {/* The handles are inherently fixed and stay far under the floor's
          content budget; the track between them is fluid. */}
      <div
        className="absolute left-0 top-1/2 h-14 w-4 -translate-y-1/2 rounded-r1"
        style={{ background: `var(--color-team-${teamA.colorIndex})` }}
        aria-hidden
      />
      <div
        className="absolute right-0 top-1/2 h-14 w-4 -translate-y-1/2 rounded-r1"
        style={{ background: `var(--color-team-${teamB.colorIndex})` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/2 h-16 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-s8"
        aria-hidden
      />
      <motion.div
        aria-hidden
        initial={false}
        animate={{ left: `${percent}%` }}
        transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        className="sticker absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-s12"
      >
        <div className="absolute inset-1.5 border-2 border-s8" aria-hidden />
      </motion.div>
    </div>
  );
}
