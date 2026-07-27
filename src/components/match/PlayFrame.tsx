/**
 * The zoomed minigame frame: a shared-element overlay (layoutId from the
 * overview card) that fills the viewport and whose inner panel follows the
 * slot phase — gate, countdown, play surface, scoring. Leaving is only
 * possible at the gate. The panel wears no sticker chrome: a full-bleed
 * surface is in-flow content, which owns the darkest ground and casts no
 * shadow (docs/UI.md's outline vocabulary — board stickers are for game
 * surfaces that float). The layout animation takes the no-overshoot curve:
 * this rect's target is the viewport edge, and Thunk's overshoot would carry
 * its borders out of frame.
 */
"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button, SLIP_DUR, SLIP_EASE_OUT, useDismissLayer } from "@jumbo/ui";
import type { MatchClient, MatchView } from "@/lib/match/client";
import type { SlotState } from "@jumbo/engine";
import { MINIGAME_SURFACES } from "@/components/minigames/registry";
import { CountdownOverlay } from "./CountdownOverlay";
import { GatePanel } from "./GatePanel";
import { ScoringScreen } from "./ScoringScreen";

function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

export function PlayFrame({
  view,
  slot,
  client,
  onLeave,
  onZoomDone,
}: {
  view: MatchView;
  slot: SlotState;
  client: MatchClient;
  onLeave: () => void;
  onZoomDone: () => void;
}): React.JSX.Element {
  const canLeave = slot.phase === "gate";
  useDismissLayer(canLeave, onLeave);
  const offsetMs = client.serverOffsetMs();
  const Surface = MINIGAME_SURFACES[slot.kind];
  const canAct =
    view.role === "player" &&
    view.viewerId !== null &&
    slot.snapshot !== null &&
    (slot.snapshot.teamA.includes(view.viewerId) ||
      slot.snapshot.teamB.includes(view.viewerId));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-scrim"
    >
      <motion.div
        layoutId={`slot-card-${slot.ordinal}`}
        transition={{
          layout: { duration: SLIP_DUR.move, ease: SLIP_EASE_OUT },
        }}
        onLayoutAnimationComplete={onZoomDone}
        className="relative flex h-full w-full flex-col overflow-hidden bg-s1"
      >
        <AnimatePresence mode="wait">
          {slot.phase === "gate" && (
            <Panel key="gate">
              <GatePanel
                view={view}
                slot={slot}
                onReady={() => client.ready(slot.ordinal)}
              />
            </Panel>
          )}
          {slot.phase === "countdown" && (
            <Panel key="countdown">
              <CountdownOverlay
                endsAt={slot.countdownEndsAt ?? 0}
                offsetMs={offsetMs}
              />
            </Panel>
          )}
          {slot.phase === "playing" && (
            <Panel key="play">
              <Surface
                view={view}
                slot={slot}
                canAct={canAct}
                onAction={(action) => client.act(slot.ordinal, action)}
                offsetMs={offsetMs}
              />
            </Panel>
          )}
          {slot.phase === "scoring" && (
            <Panel key="scoring">
              <ScoringScreen view={view} slot={slot} />
            </Panel>
          )}
        </AnimatePresence>
        {canLeave && (
          <div className="absolute top-4 right-4">
            <Button variant="outline" onClick={onLeave}>
              Back
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
