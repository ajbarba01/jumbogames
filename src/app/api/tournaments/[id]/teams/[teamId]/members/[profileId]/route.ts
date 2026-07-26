/**
 * Route handler: a team leader removes another player from their team. Only
 * the leader may kick, only while the team has no live match (the lock rule),
 * and never themselves — leaving is the paramless DELETE beside this one, and
 * it is the path that transfers leadership. The kicked player keeps their place
 * in the game and lands back on the team picker.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { requireRosterOpen } from "@/lib/tournament/access";
import { removeTeamMember } from "@/lib/tournament/remove-member";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; teamId: string; profileId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const { id, teamId, profileId } = await ctx.params;
  if (profileId === auth.profile.id) {
    return NextResponse.json(
      { error: "Use leave to remove yourself" },
      { status: 400 },
    );
  }

  const guard = await requireRosterOpen(id, teamId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { leaderId: true },
  });
  if (!team) {
    return NextResponse.json({ error: "No such team" }, { status: 404 });
  }
  if (team.leaderId !== auth.profile.id) {
    return NextResponse.json(
      { error: "Only the team leader can remove a player" },
      { status: 403 },
    );
  }

  const membership = await prisma.teamMember.findUnique({
    where: { tournamentId_profileId: { tournamentId: id, profileId } },
    select: { teamId: true },
  });
  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json(
      { error: "They are not on this team" },
      { status: 404 },
    );
  }

  await removeTeamMember({
    teamId,
    profileId,
    deleteWhenEmpty: guard.tournament.phase === "lobby",
  });

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
