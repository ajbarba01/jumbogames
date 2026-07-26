/**
 * The viewer's own team: roster with the leader marked, the team's pre-start
 * ready state, the leader's kick and ready controls, leaving, and the line
 * naming who the team plays next. While
 * the team has a live match the roster is locked — the same lock idiom the
 * board tab and the picker use — and every roster control goes flat.
 */
"use client";

import { useState } from "react";
import { Button, Card, ConfirmDialog, StatusLine, cx } from "@jumbo/ui";
import type { LobbyMemberDTO, LobbyTeamDTO } from "@/lib/tournament/lobby";
import { ROSTER_LOCKED_MESSAGE } from "@/lib/tournament/roster-lock";
import type { GameAction } from "./game-view";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function TeamRoom({
  tournamentId,
  team,
  viewerId,
  locked,
  matchupLine,
  inLobby,
  busy,
  act,
}: {
  tournamentId: string;
  team: LobbyTeamDTO;
  viewerId: string;
  locked: boolean;
  matchupLine: string | null;
  inLobby: boolean;
  busy: boolean;
  act: GameAction;
}): React.JSX.Element {
  const [kickTarget, setKickTarget] = useState<LobbyMemberDTO | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isLeader = team.leaderId === viewerId;
  const teamPath = `/api/tournaments/${tournamentId}/teams/${team.id}`;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-4 w-4 flex-none rounded-r1"
            style={{ background: `var(--color-team-${team.colorIndex})` }}
            aria-hidden
          />
          <span className="truncate font-display text-2xl uppercase text-s12">
            {team.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Every member reads their own team's ready state here, not just the
              leader holding the button below. `readyAt` stops meaning anything
              once the game starts, so the badge is pre-start only. */}
          {inLobby && team.ready ? (
            <span className="text-caps uppercase tracking-widest text-ok">
              ✓ Ready
            </span>
          ) : null}
          <span className="text-caps uppercase tracking-widest text-s7">
            {team.members.length} players
          </span>
        </div>
      </div>

      {matchupLine !== null ? (
        <p className="text-sec text-s10">{matchupLine}</p>
      ) : null}

      {locked ? (
        <StatusLine tone="warn">{ROSTER_LOCKED_MESSAGE}</StatusLine>
      ) : null}

      {/* Roster flows into two columns so a full team fills the width instead
          of running as one narrow strip. */}
      <ul className="grid gap-x-10 sm:grid-cols-2">
        {team.members.map((member) => {
          const isSelf = member.profileId === viewerId;
          return (
            <li
              key={member.profileId}
              className="flex items-center justify-between gap-3 border-t-2 border-s6 py-2.5"
            >
              <span
                className={cx(
                  "min-w-0 truncate text-sec",
                  isSelf ? "font-bold text-s12" : "text-s10",
                )}
              >
                {member.displayName}
                {member.profileId === team.leaderId ? (
                  <span
                    aria-label="Team leader"
                    role="img"
                    className="ml-2 text-accent"
                  >
                    ★
                  </span>
                ) : null}
              </span>
              {isLeader && !isSelf ? (
                <Button
                  variant="ghost"
                  icon
                  aria-label={`Remove ${member.displayName} from the team`}
                  disabled={locked || busy}
                  onClick={() => setKickTarget(member)}
                >
                  ✕
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-s6 pt-3">
        {inLobby && isLeader ? (
          <Button
            variant={team.ready ? "ghost" : "primary"}
            disabled={busy}
            onClick={() =>
              void act(() =>
                fetch(teamPath, {
                  method: "PATCH",
                  headers: JSON_HEADERS,
                  body: JSON.stringify({ ready: !team.ready }),
                }),
              )
            }
          >
            {team.ready ? "Unready" : "Ready up"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          disabled={locked || busy}
          onClick={() => setConfirmLeave(true)}
        >
          Leave team
        </Button>
      </div>

      <ConfirmDialog
        open={kickTarget !== null}
        title={`Remove ${kickTarget?.displayName ?? ""}?`}
        description="They can rejoin with the game code between rounds."
        confirmLabel="Remove"
        busy={busy}
        onConfirm={() => {
          const profileId = kickTarget?.profileId;
          setKickTarget(null);
          if (profileId === undefined) return;
          void act(() =>
            fetch(`${teamPath}/members/${profileId}`, { method: "DELETE" }),
          );
        }}
        onClose={() => setKickTarget(null)}
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Leave the team?"
        description="You can rejoin with the game code between rounds."
        confirmLabel="Leave"
        busy={busy}
        onConfirm={() => {
          setConfirmLeave(false);
          void act(() => fetch(`${teamPath}/members`, { method: "DELETE" }));
        }}
        onClose={() => setConfirmLeave(false)}
      />
    </Card>
  );
}
