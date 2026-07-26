/**
 * The host's floating control dock: every game-level host control, docked to
 * the bottom of the game surface and showing only what the current phase can
 * act on — starting the game in the lobby, starting the next round or ending
 * the game between rounds, and nothing at all once the game is complete.
 * Per-team controls are not game-level and stay on the team cards.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ConfirmDialog, StatusLine } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import type { BoardRound } from "@/lib/tournament/board";
import type { LobbyDTO, LobbyTeamDTO } from "@/lib/tournament/lobby";
import type { GameAction } from "./game-view";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function HostDock({
  tournamentId,
  phase,
  teams,
  rounds,
  busy,
  act,
  onStarted,
}: {
  tournamentId: string;
  phase: LobbyDTO["phase"];
  teams: LobbyTeamDTO[];
  rounds: BoardRound[];
  busy: boolean;
  act: GameAction;
  /** Plays the lobby → board beat; the dock never commits that swap itself. */
  onStarted: () => void;
}): React.JSX.Element | null {
  const router = useRouter();
  const { cover } = useWipeNav();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [roundBusy, setRoundBusy] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  if (phase === "complete") return null;

  const activeRound = rounds.find((round) => round.state === "active");
  const pendingRound = rounds.find((round) => round.state === "pending");
  const allReady = teams.length > 0 && teams.every((team) => team.ready);

  async function startRound(ordinal: number): Promise<void> {
    setRoundBusy(true);
    setRoundError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${ordinal}/start`,
        { method: "POST" },
      );
      // The refresh is dispatched synchronously inside cover() so it lands
      // in the wipe's transition: React only holds isPending — the
      // machine's "committed" signal — for updates scheduled before the
      // action returns, so awaiting the fetch inside cover() would drop
      // the refresh out of the transition and reveal the panel early.
      // The network wait is therefore uncovered; only the swap is covered.
      if (res.ok) {
        cover(() => router.refresh());
        return;
      }
      const data = await res.json().catch(() => null);
      setRoundError(data?.error ?? "Something went wrong.");
    } finally {
      setRoundBusy(false);
    }
  }

  // Starting the game is a beat, not an ordinary mutation: the swap into the
  // board rides the wipe rather than act's bare refresh, so the host sees the
  // same slam their players get off the broadcast. Failures stay on act.
  function start(override: boolean): void {
    void act(
      () =>
        fetch(`/api/tournaments/${tournamentId}/start`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ override }),
        }),
      onStarted,
    );
  }

  return (
    <Card
      // inset-x + mx-auto centers the dock without a transform: a filled
      // transform would turn it into a containing block for anything fixed
      // inside it, and the side inset is what keeps it inside the floor width.
      className="fixed inset-x-4 bottom-4 z-(--z-sticky) mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-3 p-4"
    >
      {phase === "lobby" ? (
        <>
          <Button
            variant="primary"
            disabled={busy || teams.length < 2 || !allReady}
            onClick={() => start(false)}
          >
            Start game
          </Button>
          <Button
            variant="outline"
            disabled={busy || teams.length < 2}
            onClick={() => start(true)}
          >
            Start anyway
          </Button>
          <StatusLine>
            {teams.length < 2
              ? "Add at least 2 teams to start."
              : allReady
                ? "All teams are ready."
                : "Waiting for all teams to ready up. Start anyway overrides."}
          </StatusLine>
        </>
      ) : (
        <>
          {activeRound ? (
            <StatusLine tone="run">
              Round {activeRound.ordinal} in play
            </StatusLine>
          ) : pendingRound ? (
            <Button
              disabled={roundBusy}
              onClick={() => void startRound(pendingRound.ordinal)}
            >
              Start round {pendingRound.ordinal}
            </Button>
          ) : null}
          {roundError !== null ? (
            <StatusLine tone="crit" live>
              {roundError}
            </StatusLine>
          ) : null}
          <Button variant="outline" onClick={() => setConfirmEnd(true)}>
            End game
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirmEnd}
        title="End game?"
        description="Standings freeze and the board shows the final result for everyone."
        confirmLabel="End game"
        busy={busy}
        onConfirm={() => {
          setConfirmEnd(false);
          void act(() =>
            fetch(`/api/tournaments/${tournamentId}/complete`, {
              method: "POST",
            }),
          );
        }}
        onClose={() => setConfirmEnd(false)}
      />
    </Card>
  );
}
