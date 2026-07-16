/**
 * Prisma reads for a match's authoritative state: the rows the pure mapping
 * turns into a MatchState, plus the surrounding context (version token, member
 * labels, host) the read/mutate seam and route authorization need.
 */
import { prisma } from "@/lib/prisma";
import type { MatchRows, MatchTeamRows } from "./snapshot";

export interface LoadedMatch {
  rows: MatchRows;
  version: number;
  tournamentId: string;
  roundId: string;
  labels: Record<string, string>;
  memberIds: Set<string>;
  tournamentMemberIds: Set<string>;
  hostId: string;
}

function teamRows(team: {
  id: string;
  name: string;
  colorIndex: number;
  members: { profileId: string; profile: { email: string } }[];
}): { rows: MatchTeamRows; labels: Record<string, string> } {
  const labels: Record<string, string> = {};
  for (const member of team.members)
    labels[member.profileId] = member.profile.email;
  return {
    rows: {
      id: team.id,
      name: team.name,
      colorIndex: team.colorIndex,
      memberIds: team.members.map((m) => m.profileId),
    },
    labels,
  };
}

export async function loadMatchRows(
  matchId: string,
): Promise<LoadedMatch | null> {
  const teamMembers = {
    select: { profileId: true, profile: { select: { email: true } } },
  } as const;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      version: true,
      roundId: true,
      round: {
        select: {
          drawnGames: true,
          tournament: {
            select: {
              id: true,
              hostId: true,
              members: { select: { profileId: true } },
            },
          },
        },
      },
      teamA: {
        select: {
          id: true,
          name: true,
          colorIndex: true,
          members: teamMembers,
        },
      },
      teamB: {
        select: {
          id: true,
          name: true,
          colorIndex: true,
          members: teamMembers,
        },
      },
      slots: {
        select: {
          ordinal: true,
          kind: true,
          phase: true,
          ready: true,
          snapshot: true,
          countdownEndsAt: true,
          deadline: true,
          scoringEndsAt: true,
          payload: true,
          normA: true,
          normB: true,
          winner: true,
        },
      },
    },
  });
  if (!match) return null;

  const a = teamRows(match.teamA);
  const b = match.teamB ? teamRows(match.teamB) : null;
  const labels = { ...a.labels, ...(b?.labels ?? {}) };
  const memberIds = new Set([
    ...a.rows.memberIds,
    ...(b?.rows.memberIds ?? []),
  ]);

  return {
    rows: {
      id: match.id,
      round: { drawnGames: match.round.drawnGames },
      teamA: a.rows,
      teamB: b?.rows ?? null,
      slots: match.slots,
    },
    version: match.version,
    tournamentId: match.round.tournament.id,
    roundId: match.roundId,
    labels,
    memberIds,
    tournamentMemberIds: new Set(
      match.round.tournament.members.map((m) => m.profileId),
    ),
    hostId: match.round.tournament.hostId,
  };
}
