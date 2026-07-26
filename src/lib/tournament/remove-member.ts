/**
 * The one place a player leaves a team, whether they left or a leader removed
 * them. Leadership auto-transfers to the earliest-joined remaining member
 * (DESIGN decision 17). An emptied team is deleted only before the game starts:
 * afterwards the schedule holds a foreign key to it, so it survives with no
 * members and reads as forfeited — a derived state, never a stored flag.
 */
import { prisma } from "@/lib/prisma";

export async function removeTeamMember(params: {
  teamId: string;
  profileId: string;
  deleteWhenEmpty: boolean;
}): Promise<void> {
  const { teamId, profileId, deleteWhenEmpty } = params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      leaderId: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: { id: true, profileId: true },
      },
    },
  });
  if (!team) return;

  const membership = team.members.find((m) => m.profileId === profileId);
  if (!membership) return;
  const remaining = team.members.filter((m) => m.profileId !== profileId);

  // Decide the writes up front so the transaction stays a single-shot batch
  // (the pooler runs in transaction mode; interactive transactions are unsafe).
  if (remaining.length === 0 && deleteWhenEmpty) {
    // The guard's phase read and this write are two round trips apart, so
    // don't trust `deleteWhenEmpty` alone: if the host's start commits in
    // between, a bare `team.delete` would cascade-delete the schedule's
    // Match rows for this team (onDelete: Cascade) with no error to catch.
    // Re-check both conditions inside the WHERE, atomically with the delete
    // itself, so a phase flip mid-flight makes this a no-op instead of data
    // loss. `members: { none: {} }` only holds once the member row is gone,
    // so that delete is ordered first in the same transaction.
    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id: membership.id } }),
      prisma.team.deleteMany({
        where: {
          id: teamId,
          members: { none: {} },
          tournament: { phase: "lobby" },
        },
      }),
    ]);
  } else if (remaining.length > 0 && team.leaderId === profileId) {
    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id: membership.id } }),
      prisma.team.update({
        where: { id: teamId },
        data: { leaderId: remaining[0].profileId, readyAt: null },
      }),
    ]);
  } else {
    // Either a non-leader leaving, or the last member leaving after the game
    // started. In the second case leaderId is left pointing at the departed
    // player: harmless while the team is empty, and the next joiner takes it.
    await prisma.teamMember.delete({ where: { id: membership.id } });
  }
}
