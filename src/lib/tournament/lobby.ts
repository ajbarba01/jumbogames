/**
 * Single source for reading a tournament's lobby/board state: the tournament
 * plus its teams (with members and leader) in a stable order. The GET route and
 * the server-rendered lobby page both call this so the two never drift.
 */
import { prisma } from "@/lib/prisma";
import type { TournamentPhase, Role } from "@/generated/prisma/client";
import { resolveViewer, type ViewerRelation } from "./viewer";

export function getTournamentState(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      phase: true,
      minigamesPerMatch: true,
      roundCount: true,
      hostId: true,
      teams: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          colorIndex: true,
          leaderId: true,
          readyAt: true,
          members: {
            orderBy: { joinedAt: "asc" },
            select: {
              profileId: true,
              profile: { select: { email: true } },
            },
          },
        },
      },
    },
  });
}

export type TournamentState = NonNullable<
  Awaited<ReturnType<typeof getTournamentState>>
>;

// Serializable projection sent to the client. Dates collapse to a `ready`
// boolean so the server-rendered initial props and the JSON refetch share one
// shape; the client never needs the readyAt timestamp itself.
export interface LobbyMemberDTO {
  profileId: string;
  email: string;
}

export interface LobbyTeamDTO {
  id: string;
  name: string;
  colorIndex: number;
  leaderId: string;
  ready: boolean;
  members: LobbyMemberDTO[];
}

export interface LobbyDTO {
  id: string;
  code: string;
  name: string;
  phase: TournamentPhase;
  minigamesPerMatch: number;
  roundCount: number | null;
  hostId: string;
  teams: LobbyTeamDTO[];
}

export function toLobbyDTO(state: TournamentState): LobbyDTO {
  return {
    id: state.id,
    code: state.code,
    name: state.name,
    phase: state.phase,
    minigamesPerMatch: state.minigamesPerMatch,
    roundCount: state.roundCount,
    hostId: state.hostId,
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      colorIndex: team.colorIndex,
      leaderId: team.leaderId,
      ready: team.readyAt !== null,
      members: team.members.map((member) => ({
        profileId: member.profileId,
        email: member.profile.email,
      })),
    })),
  };
}

export interface GatedTournament {
  state: TournamentState;
  relation: Extract<ViewerRelation, { allowed: true }>;
}

// IO seam: load a tournament and admit the viewer through resolveViewer in one
// step. Returns null both when the tournament is missing and when the viewer is
// refused, so callers cannot tell "no such tournament" from "not yours" — the
// 404-everywhere decision made structural. Uses getTournamentState's existing
// selection (hostId + team members), so it adds no query.
export async function gateTournamentRead(
  id: string,
  viewer: { viewerId: string; viewerRole: Role },
): Promise<GatedTournament | null> {
  const state = await getTournamentState(id);
  if (!state) return null;
  const memberIds = state.teams.flatMap((team) =>
    team.members.map((member) => member.profileId),
  );
  const relation = resolveViewer({
    viewerId: viewer.viewerId,
    viewerRole: viewer.viewerRole,
    hostId: state.hostId,
    memberIds,
    // The lobby admits players by code, and join persists no row, so any
    // signed-in user may read a lobby-phase tournament. Once it locks, only
    // host/member/admin get in.
    joinable: state.phase === "lobby",
  });
  if (!relation.allowed) return null;
  return { state, relation };
}
