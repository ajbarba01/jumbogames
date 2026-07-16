/**
 * Reads a tournament's board state: teams (name + color), the persisted
 * round-robin schedule (rounds with their matches, each match's live status,
 * and each round's state), and the current standings derived through the pure
 * engine. Also resolves the viewer's own live match id (if they're a player in
 * one), so the board can route them straight into it. Until minigames are
 * played there are no results, so standings are all zero and every match is
 * scheduled; the shape is already what the live board and any rankings page
 * consume.
 */
import { prisma } from "@/lib/prisma";
import type { TournamentPhase } from "@/generated/prisma/client";
import { computeStandings } from "./standings";

export interface BoardTeamRef {
  id: string;
  name: string;
  colorIndex: number;
}

export interface BoardStandingRow extends BoardTeamRef {
  rank: number;
  minigamesWon: number;
  cumulativeNormalized: number;
  movement: number;
}

export interface BoardMatch {
  id: string;
  teamA: BoardTeamRef;
  teamB: BoardTeamRef | null; // null => teamA has a bye this round
  live: boolean; // a slot exists and the match is not fully done
}

export interface BoardRound {
  ordinal: number;
  state: "pending" | "active" | "complete";
  matches: BoardMatch[];
}

export interface BoardDTO {
  id: string;
  name: string;
  phase: TournamentPhase;
  roundCount: number | null;
  standings: BoardStandingRow[];
  rounds: BoardRound[];
  viewerMatchId: string | null; // the viewer's own live match, if they're in one
}

export async function getBoardState(
  id: string,
  viewerId: string,
): Promise<BoardDTO | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phase: true,
      roundCount: true,
      teams: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, colorIndex: true },
      },
      rounds: {
        orderBy: { ordinal: "asc" },
        select: {
          ordinal: true,
          state: true,
          matches: {
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
  if (!tournament) return null;

  const teamById = new Map<string, BoardTeamRef>(
    tournament.teams.map((team) => [team.id, team]),
  );

  // No minigame results exist until they are played, so the engine ranks an
  // empty result set: every team at zero, ordered deterministically.
  const standings = computeStandings({
    teams: tournament.teams.map((team) => team.id),
    outcomes: [],
  }).map((row) => ({
    ...(teamById.get(row.team) as BoardTeamRef),
    rank: row.rank,
    minigamesWon: row.minigamesWon,
    cumulativeNormalized: row.cumulativeNormalized,
    movement: row.movement,
  }));

  const rounds: BoardRound[] = tournament.rounds.map((round) => ({
    ordinal: round.ordinal,
    state: round.state,
    matches: round.matches.map((match) => {
      const hasSlots = match.slots.length > 0;
      const live = hasSlots && match.slots.some((s) => s.phase !== "done");
      return {
        id: match.id,
        teamA: teamById.get(match.teamAId) as BoardTeamRef,
        teamB: match.teamBId ? (teamById.get(match.teamBId) ?? null) : null,
        live,
      };
    }),
  }));

  // Resolve the viewer's own live match (if any) in a single extra query: find
  // their team, then find the live match this round-robin schedule has them in.
  const membership = await prisma.teamMember.findUnique({
    where: {
      tournamentId_profileId: { tournamentId: id, profileId: viewerId },
    },
    select: { teamId: true },
  });
  const viewerMatchId =
    membership === null
      ? null
      : (rounds
          .flatMap((r) => r.matches)
          .find(
            (m) =>
              m.live &&
              (m.teamA.id === membership.teamId ||
                m.teamB?.id === membership.teamId),
          )?.id ?? null);

  return {
    id: tournament.id,
    name: tournament.name,
    phase: tournament.phase,
    roundCount: tournament.roundCount,
    standings,
    rounds,
    viewerMatchId,
  };
}
