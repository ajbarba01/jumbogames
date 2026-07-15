/**
 * Finds the tournament a viewer is currently in — one they host or are on a
 * team in, that has not completed — so the home page can offer a rejoin instead
 * of stranding them. Returns the most recent match, or null when they are free.
 */
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";

export interface CurrentTournament {
  id: string;
  name: string;
}

export async function findCurrentTournament(
  profileId: string,
): Promise<CurrentTournament | null> {
  return prisma.tournament.findFirst({
    where: {
      phase: { not: TournamentPhase.complete },
      OR: [{ hostId: profileId }, { members: { some: { profileId } } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
}
