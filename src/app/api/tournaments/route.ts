/**
 * Route handler: any signed-in user creates a game. Validates the body
 * (including the minigame pool, fail-closed at the write boundary), generates
 * a unique join code, and creates the game in the lobby phase with the caller
 * as its host.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { createTournamentSchema } from "@/lib/schemas/tournament";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateUniqueJoinCode } from "@/lib/tournament/join-code";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const parsed = createTournamentSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const code = await generateUniqueJoinCode(
    async (candidate) =>
      (await prisma.tournament.count({ where: { code: candidate } })) > 0,
  );

  const tournament = await prisma.tournament.create({
    data: {
      code,
      name: parsed.data.name,
      minigamesPerMatch: parsed.data.minigamesPerMatch,
      pool: parsed.data.pool,
      hostId: auth.profile.id,
    },
    select: { id: true, code: true },
  });

  return NextResponse.json({ tournament }, { status: 201 });
}
