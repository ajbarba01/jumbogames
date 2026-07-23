/**
 * Reads a tournament's board state: teams (name + color), the persisted
 * round-robin schedule (rounds with their matches, each match's live status,
 * and each round's state), and the current standings derived through the pure
 * engine. Also resolves the viewer's own live match id or active bye (if
 * they're a player in one), so the board can route or message them straight.
 * Until minigames are played, standings reflect only completed byes; the
 * shape is already what the live board and any rankings page consume.
 */
import { prisma } from "@/lib/prisma";
import type { TournamentPhase } from "@/generated/prisma/client";
import { collectByeAwards, findActiveBye, type ByeRound } from "./byes";
import {
  resolveViewerMatchId,
  type ActiveBye,
  type PlacementMatch,
} from "./placement";
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
  viewerBye: ActiveBye; // the viewer's bye in the round being played now, if any
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
      minigamesPerMatch: true,
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

  const byeRounds: ByeRound[] = tournament.rounds.map((round) => ({
    ordinal: round.ordinal,
    state: round.state,
    matches: round.matches.map((m) => ({
      teamAId: m.teamAId,
      teamBId: m.teamBId,
    })),
  }));

  // No minigame results exist until they are played, so the only credit on
  // the board so far is completed byes; everyone else ranks at zero.
  const standings = computeStandings({
    teams: tournament.teams.map((team) => team.id),
    outcomes: [],
    byes: collectByeAwards(byeRounds, tournament.minigamesPerMatch),
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
  const placementMatches: PlacementMatch[] = rounds.flatMap((r) =>
    r.matches.map((m) => ({
      id: m.id,
      teamAId: m.teamA.id,
      teamBId: m.teamB?.id ?? null,
      live: m.live,
    })),
  );
  const viewerTeamId = membership?.teamId ?? null;
  const viewerMatchId = resolveViewerMatchId(placementMatches, viewerTeamId);
  const viewerBye = findActiveBye(byeRounds, viewerTeamId);

  return {
    id: tournament.id,
    name: tournament.name,
    phase: tournament.phase,
    roundCount: tournament.roundCount,
    standings,
    rounds,
    viewerMatchId,
    viewerBye: viewerBye
      ? { ordinal: viewerBye.ordinal, minigames: tournament.minigamesPerMatch }
      : null,
  };
}
