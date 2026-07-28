/**
 * Directional drama: the leading team's colour washes in from their own wall,
 * swelling as the knot nears their pin. The wash stays glued to that team's
 * side, so it reads as identity rather than a status hue — the rope remains
 * the state indicator. Absolutely positioned; its parent owns the clipping.
 */
"use client";

import { motion } from "motion/react";
import { SLIP_DUR, SLIP_EASE, cx } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";

/** Below this the swell adds nothing — the wash still shows at `GLOW_BASE`
 *  the instant a side leads, but it stops growing until `p` clears this. */
const GLOW_FLOOR = 0.12;
const GLOW_BASE = 0.12;
const GLOW_SWELL = 0.28;

export function WinGlow({
  p,
  teamA,
  teamB,
}: {
  /** Rope position; +1 is team A's wall. */
  p: number;
  teamA: MatchTeam;
  teamB: MatchTeam;
}): React.JSX.Element {
  const strength = Math.max(0, Math.abs(p) - GLOW_FLOOR) / (1 - GLOW_FLOOR);
  return (
    <>
      {(
        [
          { team: teamA, side: "left", leading: p > 0 },
          { team: teamB, side: "right", leading: p < 0 },
        ] as const
      ).map(({ team, side, leading }) => (
        <motion.div
          key={side}
          aria-hidden
          initial={false}
          animate={{ opacity: leading ? GLOW_BASE + strength * GLOW_SWELL : 0 }}
          transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
          className={cx(
            "pointer-events-none absolute inset-y-0 w-1/2",
            side === "left" ? "left-0" : "right-0",
          )}
          style={{
            background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--color-team-${team.colorIndex}), transparent)`,
          }}
        />
      ))}
    </>
  );
}
