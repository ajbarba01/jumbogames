/**
 * Dev-only approval surface for the tier meter. It drives the *real*
 * TierMeter through the *real* tier engine — addCharge and resolveTier, not a
 * fake number — so a promotion, a demotion and a red-zone timer can each be
 * produced on demand without playing a two-minute match to reach them.
 *
 * Same argument as the background lab: the component tuned here is the
 * component the play surface mounts, so there is no port step where the design
 * quietly degrades.
 */
"use client";

import { useState } from "react";
import { Button, Select } from "@jumbo/ui";
import { useNow } from "@/components/match/use-now";
import {
  addCharge,
  CHARGE_PER_TIER,
  INITIAL_TIER,
  resolveTier,
  tierExpiresAt,
  type MatchTeam,
  type TierState,
} from "@jumbo/engine";
import { TierMeter } from "@/components/minigames/trivia/TierMeter";

const TEAM_SIZES = ["1", "3", "6", "10"] as const;

const teamA: MatchTeam = {
  id: "ta",
  name: "Alpha",
  colorIndex: 1,
  members: [],
};
const teamB: MatchTeam = {
  id: "tb",
  name: "Bravo",
  colorIndex: 3,
  members: [],
};

/**
 * A lab clock the buttons can jump forward, so a 30-second tier timer can be
 * driven to its red zone or past its deadline without waiting it out. Built on
 * the app's own useNow so the bar drains on a real tick rather than a value
 * read impurely during render.
 */
function useLabClock(): [number, (ms: number) => void] {
  const [skew, setSkew] = useState(0);
  const now = useNow(250);
  return [now + skew, (ms) => setSkew((s) => s + ms)];
}

export function TierLab(): React.JSX.Element {
  const [now, jump] = useLabClock();
  const [size, setSize] = useState<string>("3");
  const [a, setA] = useState<TierState>(INITIAL_TIER);
  const [b, setB] = useState<TierState>(INITIAL_TIER);

  const teamSize = Number(size);
  const resolvedA = resolveTier(a, now);
  const resolvedB = resolveTier(b, now);

  /** One correct answer from one player: the same 1/teamSize the server adds. */
  function answer(): void {
    setA((prev) => addCharge(prev, now, 1 / teamSize));
  }

  /** Enough answers to buy a whole tier at this team size. */
  function promote(): void {
    setA((prev) => addCharge(prev, now, CHARGE_PER_TIER));
  }

  /** Jump past the current tier's deadline so the timer expires and it slips. */
  function demote(): void {
    const expiresAt = tierExpiresAt(a, now);
    if (expiresAt === null) {
      // Unstarted: start it with a token answer, then it can be expired.
      setA((prev) => addCharge(prev, now, 0.01));
      return;
    }
    jump(expiresAt - now + 50);
  }

  /** Jump to 80% through the tier, inside the red zone but not past it. */
  function redZone(): void {
    const expiresAt = tierExpiresAt(a, now);
    if (expiresAt === null || resolvedA.enteredAt === null) return;
    const span = expiresAt - resolvedA.enteredAt;
    jump(expiresAt - now - span * 0.2);
  }

  function reset(): void {
    setA(INITIAL_TIER);
    setB(INITIAL_TIER);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* The pair as the play surface shows it: both ends of the rope, the
          leading side lit and the trailing one dimmed. */}
      <div className="flex items-start justify-between gap-6 border-2 border-s6 bg-s1 p-6">
        <TierMeter
          team={teamA}
          tier={a}
          now={now}
          leading={resolvedA.tier >= resolvedB.tier}
          align="left"
        />
        <div className="flex flex-col items-center gap-1 self-center">
          <span className="text-caps uppercase tracking-widest text-s7">
            Gap
          </span>
          <span className="font-display text-2xl text-s12">
            {resolvedA.tier - resolvedB.tier > 0 ? "+" : ""}
            {resolvedA.tier - resolvedB.tier}
          </span>
        </div>
        <TierMeter
          team={teamB}
          tier={b}
          now={now}
          leading={resolvedB.tier > resolvedA.tier}
          align="right"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="quiet" onClick={answer}>
          One right answer
        </Button>
        <Button variant="primary" onClick={promote}>
          Promote Alpha
        </Button>
        <Button variant="quiet" onClick={demote}>
          Expire Alpha&rsquo;s timer
        </Button>
        <Button variant="quiet" onClick={redZone}>
          Jump to the red zone
        </Button>
        <Button
          variant="quiet"
          onClick={() => setB((prev) => addCharge(prev, now, CHARGE_PER_TIER))}
        >
          Promote Bravo
        </Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="flex max-w-xs flex-col gap-1">
        <span className="text-caps uppercase tracking-widest text-s7">
          Team size
        </span>
        <Select
          aria-label="Team size"
          size="field"
          options={TEAM_SIZES}
          value={size}
          onChange={setSize}
        />
      </div>

      <p className="text-meta text-s7">
        &ldquo;One right answer&rdquo; adds 1/{teamSize} charge, exactly as the
        server does — so a tier costs the same per-player effort at every team
        size, and the bar fills in {teamSize * CHARGE_PER_TIER} taps here
        whatever size is selected.
      </p>
    </div>
  );
}
