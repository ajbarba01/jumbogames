/**
 * One team's pulling power: the tier numeral, the rent-timer ring that takes
 * that tier away if the climb is too slow, and the charge bar accumulating
 * toward the next one. This is what makes the rope legible — the rope itself
 * moves only a couple of pixels a second on a projector, so the meter carries
 * the read of *why* it is moving.
 *
 * The two quantities are deliberately given different *forms* rather than
 * different colours. As two bars they read as one thing measured twice, which
 * is worst at the moment it matters most — a full charge bar beside an empty
 * timer is the difference between about to climb and about to slip. A ring
 * around the numeral and a bar beneath it cannot be confused for each other at
 * projector distance. (This is not the "two edges racing on one bar" treatment
 * the design rejected: they remain separate affordances, in separate places.)
 *
 * A game-surface indicator, not a kit member, on the same grounds Rope.tsx
 * records (docs/UI.md): the kit ships no status-indicator components, and a
 * surface designs its own against the status vocabulary. Team colour is
 * identity on the numeral; the ring's red zone is the one status hue here, and
 * it means the tier is about to be lost.
 */
"use client";

import { motion } from "motion/react";
import { cx, SLIP_DUR, SLIP_EASE, SLIP_SHAKE } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";
import {
  CHARGE_PER_TIER,
  resolveTier,
  tierExpiresAt,
  type TierState,
} from "@jumbo/engine";

/** Fraction of the tier timer left below which the assembly goes critical. */
const RED_ZONE = 0.25;
const SHAKE_DUR = 0.4;
/** Ring geometry in the SVG's own units; the element is scaled by CSS. */
const RING_R = 45;
const RING_C = 2 * Math.PI * RING_R;

export function TierMeter({
  team,
  tier,
  now,
  leading,
  align,
  compact = false,
}: {
  team: MatchTeam;
  /** Stored tier state; resolved against `now` here, never pre-resolved. */
  tier: TierState;
  /** Server-corrected clock. */
  now: number;
  /** Whether this team currently out-pulls the other. */
  leading: boolean;
  align: "left" | "right";
  /**
   * Draw at diagram scale rather than play scale, for the gate demo. Play size
   * is tuned for a projector; the demo is a miniature sitting above the ready
   * button, and at play size it pushes that button off a laptop screen.
   */
  compact?: boolean;
}): React.JSX.Element {
  const resolved = resolveTier(tier, now);
  const expiresAt = tierExpiresAt(tier, now);
  const remaining = Math.max(0, Math.min(1, timeLeft(resolved, now)));
  const critical = expiresAt !== null && remaining <= RED_ZONE;
  const charge = Math.max(0, Math.min(1, resolved.charge / CHARGE_PER_TIER));

  return (
    <div
      role="img"
      aria-label={`${team.name}: pulling power ${resolved.tier}${
        leading ? ", leading" : ""
      }${critical ? ", about to slip" : ""}`}
      className={cx(
        "flex min-w-0 flex-col gap-2",
        align === "right" ? "items-end" : "items-start",
        // Dim rather than hide: the trailing team must still be readable, and
        // the contrast between the two is the whole point of the pair.
        leading ? "opacity-100" : "opacity-55",
      )}
    >
      <div
        className={cx(
          "relative",
          compact ? "h-14 w-14" : "h-24 w-24 sm:h-32 sm:w-32",
        )}
      >
        {/* The rent timer. A ring drains clockwise from the top — a shape the
            charge bar below cannot be mistaken for, at any distance. */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={RING_R}
            fill="none"
            stroke="var(--color-s3)"
            strokeWidth="7"
          />
          {expiresAt !== null && (
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke={critical ? "var(--color-crit)" : "var(--color-s8)"}
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - remaining)}
            />
          )}
        </svg>

        {/* Keyed on the tier so a change swaps the element: a climb pops it in,
            a slip drops it. Derived from the value changing across renders, so
            no effect re-fires on every server frame. */}
        <motion.span
          key={resolved.tier}
          initial={{ scale: 0.7 }}
          animate={{ scale: 1, x: critical ? [...SLIP_SHAKE] : 0 }}
          transition={{
            ease: SLIP_EASE,
            duration: critical ? SHAKE_DUR : SLIP_DUR.enter,
          }}
          className={cx(
            "absolute inset-0 flex items-center justify-center font-display leading-none",
            compact ? "text-2xl" : "text-5xl sm:text-7xl",
          )}
          style={{ color: `var(--color-team-${team.colorIndex})` }}
        >
          {resolved.tier}
        </motion.span>
      </div>

      {/* Charge toward the next tier. Continuous, not segmented: a correct
          answer is worth 1/teamSize, so segments would read chunky for a solo
          player and invisibly fine for a team of ten. */}
      <div
        className={cx(
          "overflow-hidden rounded-r1 border-2 border-s6",
          compact ? "h-2 w-14" : "h-3 w-24 sm:h-4 sm:w-32",
        )}
        aria-hidden
      >
        <motion.div
          initial={false}
          animate={{ width: `${charge * 100}%` }}
          transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
          className={cx("h-full", leading ? "bg-s12" : "bg-s9")}
          style={align === "right" ? { marginLeft: "auto" } : undefined}
        />
      </div>
    </div>
  );
}

/**
 * Fraction of the current tier's timer still to run. Tier 0 and an unstarted
 * timer never expire, so both read as full rather than as an empty ring that
 * would imply imminent loss.
 */
function timeLeft(resolved: TierState, now: number): number {
  const expiresAt = tierExpiresAt(resolved, now);
  if (expiresAt === null || resolved.enteredAt === null) return 1;
  const span = expiresAt - resolved.enteredAt;
  if (span <= 0) return 1;
  return (expiresAt - now) / span;
}
