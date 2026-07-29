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
import { cx, SLIP_DUR, SLIP_EASE } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";

/** The chevron SVG's own width, in the units its viewBox is authored in. */
const SVG_WIDTH = 22;
/** Clearance between the knot's leading point and the arrow. */
const ARROW_AIR = 5;

export function Rope({
  p,
  gap,
  teamA,
  teamB,
  compact = false,
}: {
  /** Rope position; +1 is team A's wall (the server's convention). */
  p: number;
  /** Tier gap driving the rope right now, A minus B; 0 is a standstill. */
  gap: number;
  teamA: MatchTeam;
  teamB: MatchTeam;
  /**
   * Draw at diagram scale rather than play scale. For the gate demo, which is
   * a miniature of the game sitting above the screen's actual verb — at play
   * size it pushes the ready button off a laptop.
   */
  compact?: boolean;
}): React.JSX.Element {
  // A reads on the left, so p = +1 maps to 0%.
  const percent = ((1 - p) / 2) * 100;
  const toward = p === 0 ? null : p > 0 ? teamA.name : teamB.name;
  const pulling = gap === 0 ? null : gap > 0 ? teamA.name : teamB.name;
  return (
    <div
      role="img"
      aria-label={[
        toward === null ? "Rope at centre" : `Rope pulled toward ${toward}`,
        pulling === null ? "neither team pulling" : `${pulling} pulling`,
      ].join(", ")}
      className={cx("relative w-full", compact ? "h-14" : "h-24")}
    >
      {/* The instantaneous force read, riding the knot rather than parked at
          the rope's centre: it is the knot that is being dragged, and an arrow
          fixed to the middle stops describing it the moment the knot moves
          away. The rope travels only about two pixels a second at a one-tier
          gap on a projector, which reads as stuck — this says which way it is
          going and how hard, which the motion alone cannot. Absent at a
          standstill, on purpose. */}
      {gap !== 0 && (
        <Chevron
          gap={gap}
          percent={percent}
          teamA={teamA}
          teamB={teamB}
          compact={compact}
        />
      )}
      <div
        className={cx(
          "absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-r2",
          compact ? "h-4" : "h-6",
        )}
        style={{
          background:
            "repeating-linear-gradient(45deg, var(--color-s6) 0 8px, var(--color-s7) 8px 16px)",
        }}
        aria-hidden
      />
      {/* The handles are inherently fixed and stay far under the floor's
          content budget; the track between them is fluid. */}
      <div
        className={cx(
          "absolute top-1/2 left-0 -translate-y-1/2 rounded-r1",
          compact ? "h-9 w-2.5" : "h-14 w-4",
        )}
        style={{ background: `var(--color-team-${teamA.colorIndex})` }}
        aria-hidden
      />
      <div
        className={cx(
          "absolute top-1/2 right-0 -translate-y-1/2 rounded-r1",
          compact ? "h-9 w-2.5" : "h-14 w-4",
        )}
        style={{ background: `var(--color-team-${teamB.colorIndex})` }}
        aria-hidden
      />
      <div
        className={cx(
          "absolute top-1/2 left-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-s8",
          compact ? "h-10" : "h-16",
        )}
        aria-hidden
      />
      <motion.div
        aria-hidden
        initial={false}
        animate={{ left: `${percent}%` }}
        transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        className={cx(
          "sticker absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-s12",
          compact ? "h-7 w-7" : "h-12 w-12",
        )}
      >
        <div className="absolute inset-1.5 border-2 border-s8" aria-hidden />
      </motion.div>
    </div>
  );
}

/**
 * The force arrow, pinned to the leading edge of the knot and pointing the way
 * the knot is being dragged. It grows with the size of the tier gap driving
 * it. Team colour here is identity — whose pull this is — matching the walls
 * below, and never a status hue: the four status colours stay reserved for
 * live state (docs/UI.md).
 */
function Chevron({
  gap,
  percent,
  teamA,
  teamB,
  compact,
}: {
  gap: number;
  /** The knot's own left offset, so the arrow tracks it exactly. */
  percent: number;
  teamA: MatchTeam;
  teamB: MatchTeam;
  compact: boolean;
}): React.JSX.Element {
  const towardA = gap > 0;
  const team = towardA ? teamA : teamB;
  // Clamped so a five-tier blowout does not draw an arrow wider than the knot.
  const base = compact ? 0.6 : 1;
  const scale = base * (1 + Math.min(Math.abs(gap), 4) * 0.3);
  // The arrow sits just outside whichever of the knot's points leads. The knot
  // is a rotated square, so its points reach half its diagonal from centre —
  // 34px at play scale, 20px compact. Add half the (scaled) arrow plus a little
  // air, because the arrow is centred on this offset rather than anchored by
  // its left edge: anchoring by the edge is why it used to sit correctly when
  // pointing right and overlap the knot when pointing left.
  const knotReach = compact ? 20 : 34;
  const halfArrow = (SVG_WIDTH * scale) / 2;
  const reach = knotReach + halfArrow + ARROW_AIR;
  const offset = towardA ? -reach : reach;
  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ left: `${percent}%`, x: offset, scale }}
      transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
      className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ color: `var(--color-team-${team.colorIndex})` }}
    >
      <svg
        width={SVG_WIDTH}
        height="18"
        viewBox={`0 0 ${SVG_WIDTH} 18`}
        fill="none"
      >
        <path
          d={towardA ? "M15 2 L5 9 L15 16" : "M7 2 L17 9 L7 16"}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="square"
        />
      </svg>
    </motion.div>
  );
}
