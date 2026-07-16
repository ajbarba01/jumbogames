/**
 * Live tournament lobby. Renders teams, membership, and host controls from a
 * server-provided snapshot, then subscribes to the tournament's Realtime
 * channel and refetches canonical state on every broadcast. A separate presence
 * channel lists participants who are here but not yet on a team. All mutations
 * go through the route handlers; this view never writes state directly. Once
 * the tournament leaves the lobby, the phase-swap effect wipes the page's
 * server render from lobby to round board for every client together.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ConfirmDialog, CopyCode, TextField } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import { subscribeToTournament } from "@/lib/realtime/subscribe";
import {
  subscribeToLobbyPresence,
  type LobbyPresence,
} from "@/lib/realtime/presence";
import type { LobbyDTO, LobbyTeamDTO } from "@/lib/tournament/lobby";

const JSON_HEADERS = { "Content-Type": "application/json" };

type Props = {
  initialState: LobbyDTO;
  viewerId: string;
  viewerEmail: string;
  isHost: boolean;
};

export function LobbyView({
  initialState,
  viewerId,
  viewerEmail,
  isHost,
}: Props) {
  const router = useRouter();
  const { cover } = useWipeNav();
  const [state, setState] = useState(initialState);
  const [present, setPresent] = useState<LobbyPresence[]>([]);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${initialState.id}`);
    if (res.ok) {
      const data = await res.json();
      setState(data.tournament as LobbyDTO);
    }
  }, [initialState.id]);

  useEffect(() => {
    const unsubscribe = subscribeToTournament(initialState.id, () => {
      void refetch();
    });
    return unsubscribe;
  }, [initialState.id, refetch]);

  useEffect(() => {
    const unsubscribe = subscribeToLobbyPresence(
      initialState.id,
      { profileId: viewerId, email: viewerEmail },
      setPresent,
    );
    return unsubscribe;
  }, [initialState.id, viewerId, viewerEmail]);

  useEffect(() => {
    // Once the host starts, the page's server render swaps to the round
    // board. `phase` only ever moves forward (lobby → active → complete), so
    // this condition flips true exactly once per mount and LobbyView unmounts
    // as part of the same covered refresh — there's no path back to false
    // that could re-fire it. Every client hits this on the same Realtime
    // broadcast, so the wipe plays for host and players alike: the beat is
    // the whole tournament slamming into the round board together.
    if (state.phase !== "lobby") cover(() => router.refresh());
  }, [state.phase, cover, router]);

  async function act(request: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    const res = await request();
    if (res.ok) {
      await refetch();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
    }
    setBusy(false);
  }

  const myTeam = state.teams.find((team) =>
    team.members.some((member) => member.profileId === viewerId),
  );
  const allReady =
    state.teams.length > 0 && state.teams.every((team) => team.ready);
  const canStart = state.teams.length >= 2 && allReady;
  const canOverride = state.teams.length >= 2;

  // Everyone currently in the lobby who isn't the host and hasn't picked a team
  // yet — drawn from ephemeral presence, so it reflects who is here right now.
  const teamMemberIds = new Set(
    state.teams.flatMap((team) =>
      team.members.map((member) => member.profileId),
    ),
  );
  const unassigned = present
    .filter(
      (person) =>
        person.profileId !== state.hostId &&
        !teamMemberIds.has(person.profileId),
    )
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="slip text-meta font-bold uppercase tracking-widest text-s7 hover:text-s10"
        >
          ← Home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl uppercase text-s12">
            {state.name}
          </h1>
          <div className="flex flex-col items-end">
            <span className="text-caps uppercase tracking-widest text-s7">
              Game code
            </span>
            <CopyCode
              value={state.code}
              aria-label="Copy game code"
              data-testid="game-code"
            />
          </div>
        </div>
      </header>

      {error ? (
        <p className="text-sec text-crit" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        {state.teams.length === 0 ? (
          <p className="text-sec text-s8">
            No teams yet. Create the first one to get started.
          </p>
        ) : (
          state.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              viewerId={viewerId}
              isMyTeam={team.id === myTeam?.id}
              onMyTeam={myTeam !== undefined}
              isHost={isHost}
              busy={busy}
              onJoin={() =>
                act(() =>
                  fetch(
                    `/api/tournaments/${state.id}/teams/${team.id}/members`,
                    { method: "POST" },
                  ),
                )
              }
              onLeave={() =>
                act(() =>
                  fetch(
                    `/api/tournaments/${state.id}/teams/${team.id}/members`,
                    { method: "DELETE" },
                  ),
                )
              }
              onReady={(ready) =>
                act(() =>
                  fetch(`/api/tournaments/${state.id}/teams/${team.id}`, {
                    method: "PATCH",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ ready }),
                  }),
                )
              }
              onRemove={() =>
                act(() =>
                  fetch(`/api/tournaments/${state.id}/teams/${team.id}`, {
                    method: "DELETE",
                  }),
                )
              }
            />
          ))
        )}
      </section>

      {unassigned.length > 0 ? (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase text-s12">
              Not on a team yet
            </h2>
            <span className="text-caps uppercase tracking-widest text-s7">
              {unassigned.length} waiting
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {unassigned.map((person) => (
              <li key={person.profileId} className="text-sec text-s10">
                {person.email}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {myTeam === undefined ? (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-display text-lg uppercase text-s12">
            Create a team
          </h2>
          <form
            className="flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (teamName.trim() === "") return;
              void act(() =>
                fetch(`/api/tournaments/${state.id}/teams`, {
                  method: "POST",
                  headers: JSON_HEADERS,
                  body: JSON.stringify({ name: teamName.trim() }),
                }),
              ).then(() => setTeamName(""));
            }}
          >
            <TextField
              name="teamName"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={busy || teamName.trim() === ""}
            >
              Create team
            </Button>
          </form>
        </Card>
      ) : null}

      {isHost ? (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-display text-lg uppercase text-s12">
            Host controls
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={busy || !canStart}
              onClick={() =>
                act(() =>
                  fetch(`/api/tournaments/${state.id}/start`, {
                    method: "POST",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ override: false }),
                  }),
                )
              }
            >
              Start tournament
            </Button>
            <Button
              variant="outline"
              disabled={busy || !canOverride}
              onClick={() =>
                act(() =>
                  fetch(`/api/tournaments/${state.id}/start`, {
                    method: "POST",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ override: true }),
                  }),
                )
              }
            >
              Start anyway
            </Button>
          </div>
          <p className="text-meta text-s7">
            {state.teams.length < 2
              ? "Add at least 2 teams to start."
              : allReady
                ? "All teams are ready."
                : "Waiting for all teams to ready up. Start anyway overrides."}
          </p>
        </Card>
      ) : null}
    </main>
  );
}

function TeamCard({
  team,
  viewerId,
  isMyTeam,
  onMyTeam,
  isHost,
  busy,
  onJoin,
  onLeave,
  onReady,
  onRemove,
}: {
  team: LobbyTeamDTO;
  viewerId: string;
  isMyTeam: boolean;
  onMyTeam: boolean;
  isHost: boolean;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onReady: (ready: boolean) => void;
  onRemove: () => void;
}) {
  const isLeader = team.leaderId === viewerId;
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-4 w-4 flex-none rounded-r1"
            style={{ background: `var(--color-team-${team.colorIndex})` }}
            aria-hidden
          />
          <span className="truncate font-display text-lg uppercase text-s12">
            {team.name}
          </span>
        </div>
        {team.ready ? (
          <span className="text-caps uppercase tracking-widest text-ok">
            ✓ Ready
          </span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-1">
        {team.members.map((member) => (
          <li key={member.profileId} className="text-sec text-s10">
            {member.email}
            {member.profileId === team.leaderId ? (
              <span className="ml-2 text-meta uppercase tracking-widest text-s7">
                leader
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t-2 border-s6 pt-3">
        {!onMyTeam ? (
          <Button variant="outline" disabled={busy} onClick={onJoin}>
            Join
          </Button>
        ) : null}
        {isMyTeam ? (
          <>
            {isLeader ? (
              <Button
                variant={team.ready ? "ghost" : "primary"}
                disabled={busy}
                onClick={() => onReady(!team.ready)}
              >
                {team.ready ? "Unready" : "Ready up"}
              </Button>
            ) : null}
            <Button variant="ghost" disabled={busy} onClick={onLeave}>
              Leave team
            </Button>
          </>
        ) : null}
        {isHost ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirmRemove(true)}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove team?"
        description="This can't be undone."
        confirmLabel="Remove team"
        busy={busy}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
        onClose={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
