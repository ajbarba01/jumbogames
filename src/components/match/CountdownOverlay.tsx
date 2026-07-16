/**
 * 3-2-1 countdown rendered from the server's countdown timestamp; each
 * number pops in with the Thunk settle.
 */
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useNow } from "./use-now";

export function CountdownOverlay({
  endsAt,
}: {
  endsAt: number;
}): React.JSX.Element {
  const now = useNow();
  const remaining = Math.max(1, Math.ceil((endsAt - now) / 1000));
  return (
    <div className="flex flex-1 items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={remaining}
          initial={{ scale: 2.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          className="font-display text-8xl text-s12"
        >
          {remaining}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
