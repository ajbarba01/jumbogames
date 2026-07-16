/**
 * Showcase specimen for the real SlamWipe kit member — not a choreography
 * preview (that's WipeDemo in motion-demos.tsx), the live component. Cycles
 * it through in -> covered (with and without the still-loading cue) -> out,
 * with and without a destination label. SlamWipe is fixed inset-0 at
 * --z-wipe, so it only mounts behind a trigger; Escape registers on the
 * shared dismiss stack as a force-close so a stalled cycle can never trap
 * the showcase page.
 */
"use client";

import { useEffect, useState } from "react";
import {
  Button,
  SlamWipe,
  useDismissLayer,
  type WipeVisualPhase,
} from "@jumbo/ui";

const CUE_DELAY_MS = 900;
const HOLD_MS = 1500;

export function SlamWipeDemo(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<WipeVisualPhase>("in");
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [showCue, setShowCue] = useState(false);

  // Safety valve: if the cycle below ever stalls, Escape still gets you out.
  useDismissLayer(open, () => setOpen(false));

  useEffect(() => {
    if (!open || phase !== "covered") return;
    const cue = setTimeout(() => setShowCue(true), CUE_DELAY_MS);
    const out = setTimeout(() => setPhase("out"), HOLD_MS);
    return () => {
      clearTimeout(cue);
      clearTimeout(out);
    };
  }, [open, phase]);

  const start = (withLabel: boolean) => {
    setShowCue(false);
    setLabel(withLabel ? "Round 2" : undefined);
    setPhase("in");
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => start(false)}>
          Preview wipe
        </Button>
        <Button variant="outline" onClick={() => start(true)}>
          Preview wipe (labelled)
        </Button>
      </div>
      {open && (
        <SlamWipe
          phase={phase}
          label={label}
          showCue={showCue}
          onCovered={() => setPhase("covered")}
          onUncovered={() => setOpen(false)}
        />
      )}
    </>
  );
}
