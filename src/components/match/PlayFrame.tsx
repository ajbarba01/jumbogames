/**
 * The zoomed minigame frame: a shared-element overlay (layoutId from the
 * overview card) whose inner panel follows the slot phase — gate, countdown,
 * play surface, scoring. Leaving is only possible at the gate.
 */
"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button, useDismissLayer } from "@jumbo/ui";
import type { MatchClient, MatchView } from "@/lib/match/client";
import type { SlotState } from "@/lib/match/types";
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
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-scrim p-8"
    >
      <motion.div
        layoutId={`slot-card-${slot.ordinal}`}
        onLayoutAnimationComplete={onZoomDone}
        className="sticker relative flex h-full max-h-168 w-full max-w-4xl flex-col rounded-r4 border-s11 bg-s2 shadow-modal"
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
