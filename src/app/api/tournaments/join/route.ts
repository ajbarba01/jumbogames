/**
 * Route handler: resolve a join code to a joinable tournament. Any signed-in
 * user may look up a code; only tournaments still in the lobby admit players.
 * Returns the tournament id so the client can enter its lobby.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { joinTournamentSchema } from "@/lib/schemas/tournament";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const parsed = joinTournamentSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code: parsed.data.code },
    select: { id: true, phase: true },
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No tournament with that code" },
      { status: 404 },
    );
  }
  if (tournament.phase !== TournamentPhase.lobby) {
    return NextResponse.json(
      { error: "This tournament has already started" },
      { status: 409 },
    );
  }

  return NextResponse.json({ tournamentId: tournament.id });
}
