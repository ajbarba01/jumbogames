/**
 * Route handler: resolve a join code to a tournament. Any signed-in user may
 * look up a code at any phase — this is a read, not a roster write, so the
 * lock rule doesn't apply here. Returns the tournament id and its code so the
 * client can build a link that carries the code for the team-join write
 * (DESIGN decision 16: link = read, code = write).
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { joinTournamentSchema } from "@/lib/schemas/tournament";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, code: true },
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No game with that code" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    tournamentId: tournament.id,
    code: tournament.code,
  });
}
