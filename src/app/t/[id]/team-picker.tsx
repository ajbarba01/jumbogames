/**
 * The persistent team picker, shown to anyone not on a roster at any phase: one
 * card per team with its roster, its pre-start ready state, and a Join. A team
 * in a live match is locked
 * shut; an emptied team is marked forfeiting but stays joinable, because
 * joining revives it. Joining is a write, so it needs the game code — a viewer
 * whose link carried one posts straight away, and everyone else types it into
 * the prompt the Join button opens. Pre-start the picker also carries team
 * creation, the waiting-players list, and the host's per-team removal.
 */
"use client";

import { useState } from "react";
import { motion, MotionConfig, useAnimationControls } from "motion/react";
import {
  Button,
  Card,
  CodeInput,
  ConfirmDialog,
  SLIP_SHAKE,
  StatusLine,
  TextField,
} from "@jumbo/ui";
import type { LobbyPresence } from "@/lib/realtime/presence";
import type { LobbyTeamDTO } from "@/lib/tournament/lobby";
import { ROSTER_LOCKED_MESSAGE } from "@/lib/tournament/roster-lock";
import type { GameAction } from "./game-view";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Mirrors JOIN_CODE_LENGTH; the server is the authority and re-validates.
const CODE_LENGTH = 6;

function PickerRow({
  tournamentId,
  team,
  locked,
  code,
  inLobby,
  canRemove,
  expanded,
  busy,
  act,
  onExpand,
  onCollapse,
}: {
  tournamentId: string;
  team: LobbyTeamDTO;
  locked: boolean;
  code: string | null;
  inLobby: boolean;
  canRemove: boolean;
  expanded: boolean;
  busy: boolean;
  act: GameAction;
  onExpand: () => void;
  onCollapse: () => void;
}): React.JSX.Element {
  const [typedCode, setTypedCode] = useState("");
  const [rejected, setRejected] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const shakeControls = useAnimationControls();

  async function join(value: string): Promise<void> {
    setRejected(false);
    const message = await act(() =>
      fetch(`/api/tournaments/${tournamentId}/teams/${team.id}/members`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ code: value }),
      }),
    );
    if (message === null) return;
    setRejected(true);
    void shakeControls.start({ x: [...SLIP_SHAKE] });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex shrink-0 items-center gap-2">
          {/* The host sits here in the lobby, so this is where they read which
              team is holding up the start. `readyAt` stops meaning anything
              once the game starts, so the badge is pre-start only. */}
          {inLobby && team.ready ? (
            <span className="mr-1 text-caps uppercase tracking-widest text-ok">
              ✓ Ready
            </span>
          ) : null}
          {canRemove ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
            >
              Remove
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={locked || busy || expanded}
            onClick={() => (code === null ? onExpand() : void join(code))}
          >
            Join
          </Button>
        </div>
      </div>

      <p className="truncate text-meta text-s7">
        {team.members.length} players
        {team.members.length > 0
          ? ` · ${team.members.map((member) => member.displayName).join(" · ")}`
          : null}
      </p>

      {locked ? (
        <StatusLine tone="warn">{ROSTER_LOCKED_MESSAGE}</StatusLine>
      ) : null}
      {/* Forfeit is derived from an empty roster, never stored, so joining is
          what revives the team — the Join stays live on purpose. */}
      {team.members.length === 0 ? (
        <StatusLine tone="warn">No players — forfeiting</StatusLine>
      ) : null}

      {expanded && !locked ? (
        <motion.form
          animate={shakeControls}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 border-t-2 border-s6 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (typedCode.length === CODE_LENGTH) void join(typedCode);
          }}
        >
          <span className="text-caps font-bold uppercase tracking-widest text-s8">
            Enter the game code to join
          </span>
          <CodeInput
            aria-label="Game code"
            value={typedCode}
            onChange={(value) => {
              setTypedCode(value);
              setRejected(false);
            }}
            placeholder="JUMBOS"
            invalid={rejected}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={busy || typedCode.length < CODE_LENGTH}
            >
              {busy ? "Joining…" : "Confirm"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={onCollapse}>
              Cancel
            </Button>
          </div>
        </motion.form>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove team?"
        description="This can't be undone."
        confirmLabel="Remove team"
        busy={busy}
        onConfirm={() => {
          setConfirmRemove(false);
          void act(() =>
            fetch(`/api/tournaments/${tournamentId}/teams/${team.id}`, {
              method: "DELETE",
            }),
          );
        }}
        onClose={() => setConfirmRemove(false)}
      />
    </Card>
  );
}

export function TeamPicker({
  tournamentId,
  teams,
  hostId,
  lockedTeamIds,
  code,
  inLobby,
  canHost,
  present,
  busy,
  act,
}: {
  tournamentId: string;
  teams: LobbyTeamDTO[];
  hostId: string;
  lockedTeamIds: ReadonlySet<string>;
  code: string | null;
  inLobby: boolean;
  canHost: boolean;
  present: LobbyPresence[];
  busy: boolean;
  act: GameAction;
}): React.JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");

  // Everyone in the lobby who isn't the host and hasn't picked a team yet —
  // drawn from ephemeral presence, so it reflects who is here right now.
  const teamMemberIds = new Set(
    teams.flatMap((team) => team.members.map((member) => member.profileId)),
  );
  const unassigned = present
    .filter(
      (person) =>
        person.profileId !== hostId && !teamMemberIds.has(person.profileId),
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-3">
        <p className="text-sec text-s9">
          {teams.length === 0
            ? "No teams yet. Create the first one to get started."
            : "Pick a team to play. Teams in a live match open after their round."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <PickerRow
              key={team.id}
              tournamentId={tournamentId}
              team={team}
              locked={lockedTeamIds.has(team.id)}
              code={code}
              inLobby={inLobby}
              canRemove={canHost && inLobby}
              expanded={expandedId === team.id}
              busy={busy}
              act={act}
              onExpand={() => setExpandedId(team.id)}
              onCollapse={() => setExpandedId(null)}
            />
          ))}
        </div>

        {inLobby && unassigned.length > 0 ? (
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                  {person.displayName}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* Creating a team seats the creator on it, so it is a write and needs
            the code just as joining does — a viewer holding only a link gets
            the picker's code prompt instead. */}
        {inLobby && code !== null ? (
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="font-display text-lg uppercase text-s12">
              Create a team
            </h2>
            <form
              // min-w-0 on the field below lets it shrink to its share of the
              // row instead of forcing the row past the floor width; flex-wrap
              // drops the button under the field if the row is ever too narrow
              // to hold both (docs/UI.md fluid law).
              className="flex flex-wrap gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (teamName.trim() === "") return;
                void act(() =>
                  fetch(`/api/tournaments/${tournamentId}/teams`, {
                    method: "POST",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ name: teamName.trim(), code }),
                  }),
                ).then((message) => {
                  if (message === null) setTeamName("");
                });
              }}
            >
              <TextField
                name="teamName"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Team name"
                className="min-w-0 flex-1"
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
      </div>
    </MotionConfig>
  );
}
