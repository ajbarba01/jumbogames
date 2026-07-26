/**
 * Guards for team-room mutations. `requireLobby` covers lobby-only writes —
 * team creation, rename, ready-up and removal — which stay closed once the
 * game starts. `requireRosterOpen` covers membership (join, leave,
 * leader-kick), which DESIGN decision 17 keeps open whenever a team has no
 * live match: the lobby, or between rounds. Both return a typed result so
 * handlers map it to a status code without repeating the query.
 */
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";
import { isTeamLocked, ROSTER_LOCKED_MESSAGE } from "./roster-lock";
import type { PlacementMatch } from "./placement";

export type LobbyGuard =
  | { ok: true; tournament: { id: string; hostId: string; code: string } }
  | { ok: false; status: 404 | 409; error: string };

export async function requireLobby(id: string): Promise<LobbyGuard> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, hostId: true, phase: true, code: true },
  });
  if (!tournament) {
    return { ok: false, status: 404, error: "No such tournament" };
  }
  if (tournament.phase !== TournamentPhase.lobby) {
    return { ok: false, status: 409, error: "The lobby is closed" };
  }
  return {
    ok: true,
    tournament: {
      id: tournament.id,
      hostId: tournament.hostId,
      code: tournament.code,
    },
  };
}

export type RosterGuard =
  | {
      ok: true;
      tournament: { id: string; phase: TournamentPhase; code: string };
    }
  | { ok: false; status: 404 | 409; error: string };

/**
 * The lock rule at the write boundary: the tournament and team must exist, the
 * game must not have ended, and the team must have no live match. Loads the
 * team's matches in the same query as the tournament so the guard costs one
 * round trip.
 */
export async function requireRosterOpen(
  id: string,
  teamId: string,
): Promise<RosterGuard> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      phase: true,
      code: true,
      teams: { where: { id: teamId }, select: { id: true } },
      rounds: {
        select: {
          matches: {
            where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] },
            select: {
              id: true,
              teamAId: true,
              teamBId: true,
              slots: { select: { phase: true } },
            },
          },
        },
      },
    },
  });
  if (!tournament || tournament.teams.length === 0) {
    return { ok: false, status: 404, error: "No such team" };
  }
  if (tournament.phase === TournamentPhase.complete) {
    return { ok: false, status: 409, error: "This game has ended" };
  }

  // "Live" must mean exactly what the board means by it: a match with slots,
  // not all of them done.
  const matches: PlacementMatch[] = tournament.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      id: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      live:
        match.slots.length > 0 && match.slots.some((s) => s.phase !== "done"),
    })),
  );
  if (isTeamLocked(matches, teamId)) {
    return { ok: false, status: 409, error: ROSTER_LOCKED_MESSAGE };
  }

  return {
    ok: true,
    tournament: {
      id: tournament.id,
      phase: tournament.phase,
      code: tournament.code,
    },
  };
}
