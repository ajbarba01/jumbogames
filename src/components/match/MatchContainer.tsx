/**
 * The match container: renders one MatchClient's view through the pure
 * presentation model. Owns the reveal beat, the player's zoom choice, and
 * the container-wide input lock while choreography plays. Every consumer —
 * player, spectator, projector — mounts this same tree.
 */
"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { SLIP_DUR, SLIP_EASE } from "@jumbo/ui";
import type { MatchClient } from "@/lib/match/client";
import { derivePhase } from "@jumbo/engine";
import { computePresentation, isPristine } from "@jumbo/engine";
import { EndScreen } from "./EndScreen";
import { Overview } from "./Overview";
import { PlayFrame } from "./PlayFrame";

/** How long the settled reels hold before the chrome fades in around them. */
const SETTLE_PAUSE_MS = 700;

export function MatchContainer({
  client,
  skipIntro = false,
  onExit,
}: {
  client: MatchClient;
  skipIntro?: boolean;
  onExit?: () => void;
}): React.JSX.Element {
  const view = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getView(),
    () => client.getView(),
  );
  const { match } = view;
  const [revealDone, setRevealDone] = useState(
    () => skipIntro || !isPristine(match),
  );
  const [chosenZoom, setChosenZoom] = useState<number | null>(null);
  const [zoomAnimating, setZoomAnimating] = useState(false);

  const phase = derivePhase(match);
  const activeOrdinal = phase.kind === "slot" ? phase.slot.ordinal : null;

  // Reset the player's zoom choice when the active slot advances. Adjusting
  // state during render (React's "you might not need an effect" pattern)
  // rather than an effect, which would cascade a second commit.
  const [lastOrdinal, setLastOrdinal] = useState(activeOrdinal);
  if (activeOrdinal !== lastOrdinal) {
    setLastOrdinal(activeOrdinal);
    setChosenZoom(null);
  }

  // The reveal's own bookkeeping, which used to live inside the Reveal screen
  // and came here with the merge: count the reels that have stopped, and once
  // they all have, hold a beat before the chrome arrives.
  const [settledReels, setSettledReels] = useState(0);
  const onReelSettled = useCallback(() => setSettledReels((n) => n + 1), []);

  const presentation = computePresentation({ match, revealDone, chosenZoom });

  const reelsAllSettled = settledReels >= match.slots.length;
  useEffect(() => {
    if (revealDone || !reelsAllSettled) return;
    const id = setTimeout(() => setRevealDone(true), SETTLE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [revealDone, reelsAllSettled]);
  const zoomedSlot =
    presentation.kind === "zoom" ? match.slots[presentation.ordinal] : null;
  const locked = presentation.kind === "reveal" || zoomAnimating;

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: SLIP_DUR.move, ease: SLIP_EASE }}
    >
      <div
        aria-busy={locked}
        className={locked ? "pointer-events-none select-none" : undefined}
      >
        {presentation.kind === "complete" ? (
          <EndScreen view={view} onExit={onExit} />
        ) : (
          // One screen for both beats: the reveal is match home with its chrome
          // hidden and its cards spinning, so nothing moves when it resolves.
          <Overview
            view={view}
            revealing={presentation.kind === "reveal"}
            onRevealSettled={onReelSettled}
            onEnter={(ordinal) => {
              setZoomAnimating(true);
              setChosenZoom(ordinal);
            }}
          />
        )}
        <AnimatePresence onExitComplete={() => setZoomAnimating(false)}>
          {zoomedSlot && (
            <PlayFrame
              key={zoomedSlot.ordinal}
              view={view}
              slot={zoomedSlot}
              client={client}
              onLeave={() => {
                setZoomAnimating(true);
                setChosenZoom(null);
              }}
              onZoomDone={() => setZoomAnimating(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
