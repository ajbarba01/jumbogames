/**
 * Mockup harness: config controls (K, role, bots, skip intro) and debug
 * valves (force start, kick, late join) around a FakeMatchClient-driven
 * MatchContainer. The panel lives outside the container's input lock.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Select, StepSlider, Toggle } from "@jumbo/ui";
import { MatchContainer } from "@/components/match/MatchContainer";
import { derivePhase } from "@/lib/match/derive";
import { FakeMatchClient } from "@/lib/match/fake-client";
import type { ViewerRole } from "@/lib/match/client";

const BOT_READY_DELAY_MS = 1500;
const BOT_MASH_INTERVAL_MS = 300;
const COUNT_STOPS = ["1", "2", "3", "4"] as const;

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-s10">
      {label}
      {children}
    </label>
  );
}

export function MockupHarness(): React.JSX.Element {
  const [k, setK] = useState<(typeof COUNT_STOPS)[number]>("2");
  const [bots, setBots] = useState<(typeof COUNT_STOPS)[number]>("2");
  const [role, setRole] = useState<ViewerRole>("player");
  const [skipIntro, setSkipIntro] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const configKey = `${resetKey}-${k}-${role}-${bots}`;
  const client = useMemo(() => {
    void configKey; // a new client per config; resetKey alone also remakes it
    return new FakeMatchClient({
      k: Number(k),
      role,
      botsPerTeam: Number(bots),
      botReadyDelayMs: BOT_READY_DELAY_MS,
      botMashIntervalMs: BOT_MASH_INTERVAL_MS,
    });
  }, [configKey, k, role, bots]);
  useEffect(() => () => client.destroy(), [client]);

  const kickFirstBot = () => {
    const { match } = client.getView();
    const bot = [...match.teamA.members, ...match.teamB.members].find((id) =>
      id.startsWith("bot-"),
    );
    if (bot) client.debugKick(bot);
  };

  const forceStartActive = () => {
    const phase = derivePhase(client.getView().match);
    if (phase.kind === "slot") client.forceStart(phase.slot.ordinal);
  };

  return (
    <div className="min-h-dvh bg-s1">
      <MatchContainer
        key={configKey}
        client={client}
        skipIntro={skipIntro}
        onExit={() => setResetKey((n) => n + 1)}
      />
      <Card className="fixed bottom-4 left-4 z-(--z-sticky) flex w-64 flex-col gap-3 p-4">
        <Labeled label="Minigames (K)">
          <StepSlider
            stops={COUNT_STOPS}
            value={k}
            onChange={setK}
            aria-label="Minigames per match"
          />
        </Labeled>
        <Labeled label="Bots per team">
          <StepSlider
            stops={COUNT_STOPS}
            value={bots}
            onChange={setBots}
            aria-label="Bots per team"
          />
        </Labeled>
        <Labeled label="Role">
          <Select
            options={["player", "spectator"]}
            value={role}
            onChange={(v) => setRole(v as ViewerRole)}
            aria-label="Viewer role"
          />
        </Labeled>
        <Labeled label="Skip reveal">
          <Toggle
            on={skipIntro}
            onChange={setSkipIntro}
            aria-label="Skip reveal"
          />
        </Labeled>
        <Button onClick={forceStartActive}>Force start</Button>
        <Button onClick={kickFirstBot}>Kick a bot</Button>
        <Button onClick={() => client.debugJoinBot("B")}>
          Late-join bot → B
        </Button>
        <Button onClick={() => setResetKey((n) => n + 1)}>Reset</Button>
      </Card>
    </div>
  );
}
