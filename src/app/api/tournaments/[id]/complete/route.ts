/**
 * Route handler: the host ends a running tournament. Enforces host identity and
 * that the tournament is active, then freezes it into the complete phase and
 * broadcasts the change so every board flips to its final, ended state.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { hostId: true, phase: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "No such tournament" }, { status: 404 });
  }
  if (tournament.hostId !== auth.profile.id) {
    return NextResponse.json(
      { error: "Only the host can end this tournament" },
      { status: 403 },
    );
  }
  if (tournament.phase !== TournamentPhase.active) {
    return NextResponse.json(
      { error: "Only a running tournament can be ended" },
      { status: 409 },
    );
  }

  await prisma.tournament.update({
    where: { id },
    data: { phase: TournamentPhase.complete, completedAt: new Date() },
  });

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
