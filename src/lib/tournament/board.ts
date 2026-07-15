/**
 * Reads a tournament's board state: teams (name + color), the persisted
 * round-robin schedule (rounds with their matches), and the current standings
 * derived through the pure engine. Until minigames are played there are no
 * results, so standings are all zero and every match is scheduled; the shape is
 * already what the live board and any rankings page consume.
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
}

export interface BoardRound {
  ordinal: number;
  matches: BoardMatch[];
}

export interface BoardDTO {
  id: string;
  name: string;
  phase: TournamentPhase;
  roundCount: number | null;
  standings: BoardStandingRow[];
  rounds: BoardRound[];
}

export async function getBoardState(id: string): Promise<BoardDTO | null> {
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
          matches: {
            select: { id: true, teamAId: true, teamBId: true },
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
    matches: round.matches.map((match) => ({
      id: match.id,
      teamA: teamById.get(match.teamAId) as BoardTeamRef,
      teamB: match.teamBId ? (teamById.get(match.teamBId) ?? null) : null,
    })),
  }));

  return {
    id: tournament.id,
    name: tournament.name,
    phase: tournament.phase,
    roundCount: tournament.roundCount,
    standings,
    rounds,
  };
}
