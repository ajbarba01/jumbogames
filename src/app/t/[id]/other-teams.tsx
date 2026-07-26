/**
 * The rest of the field, listed under the viewer's own team room: every other
 * team's identity, size, and pre-start ready state. Deliberately name-only —
 * rosters belong to the team that owns them, and the reason this exists is that
 * a player who has joined a team could otherwise no longer see who is holding
 * up the start, which only the unassigned viewer's picker showed.
 */
"use client";

import { Card, StatusLine } from "@jumbo/ui";
import type { LobbyTeamDTO } from "@/lib/tournament/lobby";

export function OtherTeams({
  teams,
  myTeamId,
  inLobby,
}: {
  teams: LobbyTeamDTO[];
  myTeamId: string;
  inLobby: boolean;
}): React.JSX.Element | null {
  const others = teams.filter((team) => team.id !== myTeamId);
  if (others.length === 0) return null;

  const waiting = inLobby
    ? others.filter((team) => !team.ready && team.members.length > 0).length
    : 0;

  return (
    <Card className="mt-3 flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg uppercase text-s12">Other teams</h2>
        <span className="text-caps uppercase tracking-widest text-s7">
          {others.length} {others.length === 1 ? "team" : "teams"}
        </span>
      </div>

      <ul className="grid gap-x-10 sm:grid-cols-2">
        {others.map((team) => (
          <li
            key={team.id}
            className="flex items-center justify-between gap-3 border-t-2 border-s6 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 flex-none rounded-r1"
                style={{ background: `var(--color-team-${team.colorIndex})` }}
                aria-hidden
              />
              <span className="min-w-0 truncate text-sec text-s10">
                {team.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {/* Same pre-start rule the team room and picker follow: `readyAt`
                  stops meaning anything once the game starts. */}
              {inLobby && team.ready ? (
                <span className="text-caps uppercase tracking-widest text-ok">
                  ✓ Ready
                </span>
              ) : null}
              {/* Forfeit is derived from an empty roster, never stored. */}
              {team.members.length === 0 ? (
                <span className="text-caps uppercase tracking-widest text-warn">
                  forfeiting
                </span>
              ) : null}
              <span className="text-caps uppercase tracking-widest text-s7">
                {team.members.length}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {inLobby && waiting > 0 ? (
        <StatusLine>
          {waiting === 1
            ? "1 other team hasn’t readied up yet"
            : `${waiting} other teams haven’t readied up yet`}
        </StatusLine>
      ) : null}
    </Card>
  );
}
