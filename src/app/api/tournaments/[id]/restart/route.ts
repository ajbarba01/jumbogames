/**
 * Route handler: the host restarts a game, dropping it back into the lobby with
 * its teams intact. Enforces host identity and that the game has actually
 * started, then deletes the whole schedule and clears the phase timestamps.
 *
 * Rounds cascade to matches and matches to slots (see schema.prisma), so
 * deleting the rounds is what discards every played result — there is no second
 * place results are kept. Teams, their members and their ready flags survive
 * on purpose: re-running a game with the same roster is the point, and a host
 * who wanted the roster gone would delete the game instead.
 */
import { NextResponse } from "next/server";
import { requireUser, isGameHost } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
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
  if (!isGameHost(auth.profile, tournament.hostId)) {
    return NextResponse.json(
      { error: "Only the host can restart this game" },
      { status: 403 },
    );
  }
  if (tournament.phase === TournamentPhase.lobby) {
    return NextResponse.json(
      { error: "This game has not started yet" },
      { status: 409 },
    );
  }

  // One transaction: a half-restarted game — schedule gone but still active —
  // would leave every client on a board with no rounds to show.
  await prisma.$transaction([
    prisma.round.deleteMany({ where: { tournamentId: id } }),
    prisma.tournament.update({
      where: { id },
      data: {
        phase: TournamentPhase.lobby,
        roundCount: null,
        startedAt: null,
        completedAt: null,
      },
    }),
  ]);

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
