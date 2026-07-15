/**
 * Showcase specimen proving the motion integration: layoutId shared-element
 * zoom from a preview card into a full overlay — the M4 minigame-zoom
 * mechanism. Thunk constants keep the profile token-true.
 */
"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button, SLIP_DUR, SLIP_EASE, useDismissLayer } from "@jumbo/ui";

const TRANSITION = { duration: SLIP_DUR.move, ease: SLIP_EASE };

export function ZoomDemo(): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null);
  // Escape must close only the topmost kit layer, not this overlay
  // unconditionally — the same stack every ModalShell/PopoverCard joins.
  useDismissLayer(open !== null, () => setOpen(null));

  return (
    <MotionConfig reducedMotion="user" transition={TRANSITION}>
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <motion.button
            key={i}
            layoutId={`zoom-card-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            className="slip sticker sticker-hover sticker-press h-24 w-36 cursor-pointer rounded-r2 border-s11 bg-s2 text-sec font-bold text-s11 hover:text-s12"
          >
            Preview {i + 1}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-scrim p-12"
            onClick={() => setOpen(null)}
          >
            <motion.div
              layoutId={`zoom-card-${open}`}
              className="sticker flex h-full max-h-96 w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-r4 border-s11 bg-s2 shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-body text-s12">
                Minigame surface {open + 1}
              </p>
              <Button variant="outline" onClick={() => setOpen(null)}>
                Zoom out
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
