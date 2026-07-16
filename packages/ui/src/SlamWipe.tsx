/**
 * The slam wipe (docs/UI.md moment, graduated from the showcase preview): a
 * solid accent-2 panel that covers the viewport. Presentational only — a parent
 * drives `phase` and this owns the sweep choreography, an optional destination
 * label, and a still-loading cue. Under reduced motion the sweep collapses to an
 * instant cut. No router, no timers.
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { WIPE_DUR, WIPE_EASE } from "./motion";
import { Spinner } from "./Spinner";

export type WipeVisualPhase = "in" | "covered" | "out";

export interface SlamWipeProps {
  phase: WipeVisualPhase;
  label?: string;
  showCue?: boolean;
  /** Fires when the in-sweep finishes covering (parent then navigates). */
  onCovered?: () => void;
  /** Fires when the out-sweep finishes uncovering (parent returns to idle). */
  onUncovered?: () => void;
}

// Panel rests fully covering at 0%; enters from the left edge, exits past the
// right. 102% keeps the edge off-screen through the whole sweep.
const OFFSCREEN_LEFT = "-102%";
const COVERING = "0%";
const OFFSCREEN_RIGHT = "102%";

export function SlamWipe({
  phase,
  label,
  showCue = false,
  onCovered,
  onUncovered,
}: SlamWipeProps): React.JSX.Element {
  const reduce = useReducedMotion();
  const initialX = phase === "in" ? OFFSCREEN_LEFT : COVERING;
  const animateX = phase === "out" ? OFFSCREEN_RIGHT : COVERING;
  const dur = phase === "out" ? WIPE_DUR.out : WIPE_DUR.in;

  return (
    <motion.div
      data-testid="slam-wipe"
      initial={{ x: initialX }}
      animate={{ x: animateX }}
      transition={reduce ? { duration: 0 } : { duration: dur, ease: WIPE_EASE }}
      onAnimationComplete={() => {
        if (phase === "in") onCovered?.();
        if (phase === "out") onUncovered?.();
      }}
      className="fixed inset-0 z-(--z-wipe) flex items-center justify-center bg-accent-2"
    >
      {label ? (
        <span className="font-display text-4xl uppercase text-edge">
          {label}
        </span>
      ) : null}
      {showCue ? (
        <Spinner
          label="Still loading"
          className="absolute bottom-10 text-edge"
        />
      ) : null}
    </motion.div>
  );
}
