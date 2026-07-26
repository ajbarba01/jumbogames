/**
 * Route handlers on a single team in the lobby. PATCH toggles the team's ready
 * flag (leader only). DELETE removes the team (host only) as the "drop a dead
 * team" override before starting.
 */
import { NextResponse } from "next/server";
import { requireUser, isGameHost } from "@/lib/auth/profile";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readyTeamSchema } from "@/lib/schemas/tournament";
import { requireLobby } from "@/lib/tournament/access";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function PATCH(
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

  const { id, teamId } = await ctx.params;
  const parsed = readyTeamSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lobby = await requireLobby(id);
  if (!lobby.ok) {
    return NextResponse.json({ error: lobby.error }, { status: lobby.status });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, tournamentId: id },
    select: { leaderId: true },
  });
  if (!team) {
    return NextResponse.json({ error: "No such team" }, { status: 404 });
  }
  if (team.leaderId !== auth.profile.id) {
    return NextResponse.json(
      { error: "Only the team leader can ready up" },
      { status: 403 },
    );
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { readyAt: parsed.data.ready ? new Date() : null },
  });

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; teamId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id, teamId } = await ctx.params;
  const lobby = await requireLobby(id);
  if (!lobby.ok) {
    return NextResponse.json({ error: lobby.error }, { status: lobby.status });
  }
  if (!isGameHost(auth.profile, lobby.tournament.hostId)) {
    return NextResponse.json(
      { error: "Only the host can remove teams" },
      { status: 403 },
    );
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, tournamentId: id },
    select: { id: true },
  });
  if (!team) {
    return NextResponse.json({ error: "No such team" }, { status: 404 });
  }

  // requireLobby's phase read and this write are two round trips apart, so
  // don't trust it alone: if the host's start commits in between, a bare
  // `team.delete` would cascade-delete the schedule's Match rows for this team
  // (onDelete: Cascade) with no error to catch. Re-check the phase inside the
  // WHERE, atomically with the delete itself, so a flip mid-flight makes this a
  // no-op instead of silent data loss. Same shape as removeTeamMember's empty
  // team delete (src/lib/tournament/remove-member.ts) — the twins match.
  await prisma.team.deleteMany({
    where: { id: teamId, tournament: { phase: "lobby" } },
  }); // cascades members
  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
