/**
 * Button Masher's gate demo: a button cap taking a press on a loop. The stub is
 * devOnly and no player ever reaches this, but the registry requires a Demo of
 * every minigame on purpose — a game that ships without one gets a wall of text
 * at the gate, and the exemption would start here.
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { SLIP_EASE } from "@jumbo/ui";

export function StubDemo(): React.JSX.Element {
  const reduced = useReducedMotion();
  return (
    <div
      role="img"
      aria-label="Demonstration: pressing the button repeatedly raises your score."
      className="flex h-32 w-full items-center justify-center"
    >
      <motion.span
        animate={reduced ? undefined : { scale: [1, 0.86, 1] }}
        transition={{ duration: 0.5, ease: SLIP_EASE, repeat: Infinity }}
        className="sticker flex h-20 w-20 items-center justify-center rounded-full bg-s3 font-display text-lg text-s12"
      >
        +1
      </motion.span>
    </div>
  );
}
