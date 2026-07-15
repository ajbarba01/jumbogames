/**
 * Route handlers for team membership in the lobby. POST joins the caller to a
 * team; DELETE removes the caller, reassigning leadership to the oldest
 * remaining member and deleting the team when it empties. A player is on at
 * most one team per tournament.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireLobby } from "@/lib/tournament/access";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
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
  const lobby = await requireLobby(id);
  if (!lobby.ok) {
    return NextResponse.json({ error: lobby.error }, { status: lobby.status });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, tournamentId: id },
    select: { id: true },
  });
  if (!team) {
    return NextResponse.json({ error: "No such team" }, { status: 404 });
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
    await prisma.teamMember.create({
      data: { tournamentId: id, teamId, profileId: auth.profile.id },
    });
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
  const lobby = await requireLobby(id);
  if (!lobby.ok) {
    return NextResponse.json({ error: lobby.error }, { status: lobby.status });
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

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      leaderId: true,
      members: { orderBy: { joinedAt: "asc" }, select: { profileId: true } },
    },
  });
  if (!team) {
    return NextResponse.json({ error: "No such team" }, { status: 404 });
  }

  const remaining = team.members.filter(
    (member) => member.profileId !== auth.profile.id,
  );

  // Decide the writes up front so the transaction stays a single-shot batch
  // (the pooler runs in transaction mode; interactive transactions are unsafe).
  if (remaining.length === 0) {
    await prisma.team.delete({ where: { id: teamId } }); // cascades the member
  } else if (team.leaderId === auth.profile.id) {
    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id: membership.id } }),
      prisma.team.update({
        where: { id: teamId },
        data: { leaderId: remaining[0].profileId, readyAt: null },
      }),
    ]);
  } else {
    await prisma.teamMember.delete({ where: { id: membership.id } });
  }

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
