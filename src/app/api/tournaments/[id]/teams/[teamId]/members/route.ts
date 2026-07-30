/**
 * Route handlers for team membership. POST joins the caller to a team; the
 * code must match the game's (DESIGN decision 16: link = read, code = write).
 * DELETE is self-leave. Both are open only while the team has no live match —
 * the lobby, or between rounds (DESIGN decision 17) — via requireRosterOpen.
 * Leaving reassigns leadership to the oldest remaining member and, pre-start
 * only, deletes the team when it empties; see remove-member.ts for why that
 * changes after the game starts. A player is on at most one team per
 * tournament.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireRosterOpen } from "@/lib/tournament/access";
import { removeTeamMember } from "@/lib/tournament/remove-member";
import { joinTeamSchema } from "@/lib/schemas/tournament";
import { parseJsonBody } from "@/lib/http";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; teamId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const parsed = joinTeamSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { id, teamId } = await ctx.params;
  const guard = await requireRosterOpen(id, teamId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (parsed.data.code !== guard.tournament.code) {
    return NextResponse.json(
      { error: "That code doesn't match this game" },
      { status: 403 },
    );
  }

  const existing = await prisma.teamMember.findUnique({
    where: {
      tournamentId_profileId: { tournamentId: id, profileId: auth.profile.id },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You are already on a team" },
      { status: 409 },
    );
  }

  try {
    const memberCount = await prisma.teamMember.count({ where: { teamId } });
    if (memberCount === 0) {
      await prisma.$transaction([
        prisma.teamMember.create({
          data: { tournamentId: id, teamId, profileId: auth.profile.id },
        }),
        prisma.team.update({
          where: { id: teamId },
          data: { leaderId: auth.profile.id, readyAt: null },
        }),
      ]);
    } else {
      await prisma.teamMember.create({
        data: { tournamentId: id, teamId, profileId: auth.profile.id },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "You are already on a team" },
        { status: 409 },
      );
    }
    throw error;
  }

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; teamId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const { id, teamId } = await ctx.params;
  const guard = await requireRosterOpen(id, teamId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      tournamentId_profileId: { tournamentId: id, profileId: auth.profile.id },
    },
    select: { id: true, teamId: true },
  });
  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json(
      { error: "You are not on this team" },
      { status: 404 },
    );
  }

  await removeTeamMember({
    teamId,
    profileId: auth.profile.id,
    deleteWhenEmpty: guard.tournament.phase === "lobby",
  });

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
