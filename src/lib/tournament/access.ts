/**
 * Shared guard for lobby mutations: a tournament must exist and still be in the
 * lobby phase before teams or membership may change. Returns a typed result so
 * handlers map it to a status code without repeating the query.
 */
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";

export type LobbyGuard =
  | { ok: true; tournament: { id: string; hostId: string } }
  | { ok: false; status: 404 | 409; error: string };

export async function requireLobby(id: string): Promise<LobbyGuard> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, hostId: true, phase: true },
  });
  if (!tournament) {
    return { ok: false, status: 404, error: "No such tournament" };
  }
  if (tournament.phase !== TournamentPhase.lobby) {
    return { ok: false, status: 409, error: "The lobby is closed" };
  }
  return {
    ok: true,
    tournament: { id: tournament.id, hostId: tournament.hostId },
  };
}
