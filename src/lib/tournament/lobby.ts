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
              profile: { select: { displayName: true } },
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
  displayName: string;
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
  // The write credential (DESIGN.md decision 16: "link = read, code =
  // write"). Null when the caller determined this viewer does not already
  // hold it — see holdsGameCode in viewer.ts, the single source for that
  // rule.
  code: string | null;
  name: string;
  phase: TournamentPhase;
  minigamesPerMatch: number;
  roundCount: number | null;
  hostId: string;
  teams: LobbyTeamDTO[];
}

// `includeCode` defaults to false: the code is a write credential, so a caller
// that forgets the argument withholds it rather than leaks it. Pass true only
// after checking holdsGameCode (viewer.ts owns that rule).
export function toLobbyDTO(
  state: TournamentState,
  includeCode = false,
): LobbyDTO {
  return {
    id: state.id,
    code: includeCode ? state.code : null,
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
        displayName: member.profile.displayName,
      })),
    })),
  };
}

export interface GatedTournament {
  state: TournamentState;
  relation: ViewerRelation;
}

// IO seam: load a tournament and resolve the viewer's relation through
// resolveViewer in one step. Returns null only when the tournament does not
// exist — every signed-in viewer is admitted as at least a guest (decision 16,
// spectate by link). Uses getTournamentState's existing selection (hostId +
// team members), so it adds no query.
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
  });
  return { state, relation };
}
