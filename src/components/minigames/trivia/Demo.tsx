/**
 * Tug O' Lore's gate demo: a looping, non-interactive run of the real play
 * surface, so a player meets the rope before the rope starts counting. The
 * components here are the shipping ones — TierMeter and Rope, unmodified — and
 * only their inputs are staged, by the pure script in demo-script.ts.
 *
 * The band is one picture. It is `role="img"` with a summary label rather than
 * a tree of readable controls: a screen-reader user gets the rules from the
 * instructions beside it, and a fake question stream they cannot answer would
 * be noise at best and a trap at worst.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cx, SLIP_SHAKE } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";
import { Rope } from "./Rope";
import { TierMeter } from "./TierMeter";
import { CYCLE_MS, demoFrameAt, STILL_FRAME_MS } from "./demo-script";

/**
 * The loop runs at 20fps, not at the display's rate. The rope crawls and the
 * ring drains; neither reads any better at 60, and this is decoration sitting
 * underneath a screen whose real job is collecting ready checks.
 */
const FRAME_MS = 50;
const SHAKE_DUR = 0.4;

/**
 * The demo's clock: elapsed ms into the cycle, plus the reading the staged tier
 * timers are back-dated against. Both come out of the loop rather than out of
 * `Date.now()` at render time, so rendering stays pure and two renders of the
 * same frame draw the same picture.
 *
 * The clock is relative, not absolute — the script back-dates every timer from
 * whatever it reads. So the reduced-motion path, where no loop ever runs and it
 * stays at zero, draws the pinned frame exactly as intended.
 */
function useDemoClock(): { elapsed: number; now: number } {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let lastPainted = 0;
    const tick = (time: number) => {
      startedAt.current ??= time;
      if (time - lastPainted >= FRAME_MS) {
        lastPainted = time;
        setElapsed((time - startedAt.current) % CYCLE_MS);
        setNow(time);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return { elapsed: reduced ? STILL_FRAME_MS : elapsed, now };
}

/**
 * A staged answer choice. Play wraps a real sticker Button in a separate
 * verdict ring; the demo cannot, because the sticker's hard offset shadow
 * shifts the face out from under a ring drawn around its unshifted box. So the
 * verdict lives on the choice's own border and the sticker chrome comes off
 * entirely — which is the honest call regardless: these are not pressable, and
 * wearing press chrome would promise a control that isn't there.
 */
function DemoChoice({
  label,
  state,
}: {
  label: string;
  state: "idle" | "correct" | "wrong";
}): React.JSX.Element {
  return (
    <motion.span
      animate={state === "wrong" ? { x: [...SLIP_SHAKE] } : undefined}
      transition={{ duration: SHAKE_DUR }}
      className={cx(
        "flex w-full items-center justify-center rounded-r2 border-2 bg-s3 px-3 py-1.5 text-sec font-bold text-s12",
        state === "correct" && "border-ok",
        state === "wrong" && "border-crit",
        state === "idle" && "border-s6",
      )}
    >
      {label}
    </motion.span>
  );
}

export function TriviaDemo({
  teamA,
  teamB,
}: {
  teamA: MatchTeam;
  teamB: MatchTeam;
}): React.JSX.Element {
  const { elapsed, now } = useDemoClock();
  const frame = demoFrameAt(elapsed, now);

  return (
    <div
      role="img"
      aria-label="Demonstration: answering correctly raises a team's pulling power, and the leading team drags the rope toward its wall."
      className="flex w-full max-w-2xl flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <TierMeter
          team={teamA}
          tier={frame.tierA}
          now={frame.now}
          compact
          leading={frame.gap > 0}
          align="left"
        />
        <TierMeter
          team={teamB}
          tier={frame.tierB}
          now={frame.now}
          compact
          leading={frame.gap < 0}
          align="right"
        />
      </div>

      <Rope p={frame.p} gap={frame.gap} teamA={teamA} teamB={teamB} compact />

      <div className="flex flex-col gap-2">
        <p className="text-center text-sec font-bold text-balance text-s11">
          {frame.card.prompt}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {frame.card.choices.map((choice, index) => (
            <DemoChoice
              key={index}
              label={choice}
              state={index === frame.picked ? frame.verdict : "idle"}
            />
          ))}
        </div>
        {/* Reserved rather than conditional: a banner that appears and vanishes
            inside a loop would bounce the whole gate screen every ten seconds. */}
        <p
          className={cx(
            "text-center text-sec font-bold text-crit",
            frame.lockoutSeconds === null && "invisible",
          )}
        >
          Wrong — back in {frame.lockoutSeconds ?? 0}s
        </p>
      </div>
    </div>
  );
}
