/**
 * The score-pop moment in member form: a hand-written ±N that rises off the
 * value it annotates, tilts with the sign, and fades. It fires once per beat
 * — a new `popKey` remounts it — and it is decorative, because the score it
 * annotates is already on screen as live text.
 */
"use client";

import { motion } from "motion/react";
import { cx } from "../cx";
import { POP_DUR, POP_RISE, POP_TILT, SLIP_EASE } from "../motion";

export interface ScorePopProps {
  /**
   * Increment to fire. The value keys the animation, so a repeat of the same
   * delta still pops. Zero renders nothing — nothing has landed yet.
   */
  popKey: number;
  /** Signed points. Sign picks the glyph, the hue and the tilt direction. */
  delta: number;
  /** Placement is the consumer's — the default anchors above and right. */
  className?: string;
}

export function ScorePop({
  popKey,
  delta,
  className,
}: ScorePopProps): React.JSX.Element | null {
  if (popKey === 0) return null;
  const gain = delta > 0;
  return (
    <motion.span
      key={popKey}
      initial={{ opacity: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: POP_RISE,
        rotate: gain ? POP_TILT : -POP_TILT,
      }}
      transition={{ duration: POP_DUR, ease: SLIP_EASE }}
      className={cx(
        "pointer-events-none absolute -top-1 right-0 font-hand text-xl",
        gain ? "text-ok" : "text-crit",
        className,
      )}
      aria-hidden
    >
      {gain ? `+${delta}` : delta}
    </motion.span>
  );
}
