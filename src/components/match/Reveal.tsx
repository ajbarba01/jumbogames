/**
 * Round reveal: K slot-machine reels spin through the pool and settle on the
 * drawn minigames; settled reels share layoutIds with the overview's cards
 * so the reveal morphs into the overview.
 */
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SLIP_EASE } from "@jumbo/ui";
import { MINIGAMES } from "@/lib/minigames/registry";
import type { MinigameKind } from "@/lib/minigames/types";

const REEL_PASSES = 3;
const REEL_BASE_SECONDS = 1.2;
const REEL_STAGGER_SECONDS = 0.35;
const SETTLE_PAUSE_MS = 700;
const ITEM_REM = 10; // matches the h-40 (10rem) reel window

function Reel({
  kind,
  index,
  onSettled,
}: {
  kind: MinigameKind;
  index: number;
  onSettled: () => void;
}): React.JSX.Element {
  const titles = Object.values(MINIGAMES).map((g) => g.title);
  const strip = Array.from({ length: REEL_PASSES }, () => titles)
    .flat()
    .concat(MINIGAMES[kind].title);

  return (
    <motion.div
      layoutId={`slot-card-${index}`}
      className="sticker h-40 w-52 overflow-hidden rounded-r2 border-s11 bg-s2"
    >
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: `-${(strip.length - 1) * ITEM_REM}rem` }}
        transition={{
          duration: REEL_BASE_SECONDS + index * REEL_STAGGER_SECONDS,
          ease: SLIP_EASE,
        }}
        onAnimationComplete={onSettled}
      >
        {strip.map((title, i) => (
          <div
            key={i}
            className="flex h-40 items-center justify-center font-display text-lg text-s12"
          >
            {title}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export function Reveal({
  kinds,
  onDone,
}: {
  kinds: MinigameKind[];
  onDone: () => void;
}): React.JSX.Element {
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    if (settled < kinds.length) return;
    const id = setTimeout(onDone, SETTLE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [settled, kinds.length, onDone]);

  return (
    <div className="flex min-h-dvh items-center justify-center gap-6 p-8">
      {kinds.map((kind, i) => (
        <Reel
          key={i}
          kind={kind}
          index={i}
          onSettled={() => setSettled((n) => n + 1)}
        />
      ))}
    </div>
  );
}
