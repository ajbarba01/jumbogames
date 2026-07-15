/**
 * Route handler: an admin or owner hosts a new tournament. Validates the body,
 * generates a unique join code, and creates the tournament in the lobby phase
 * with the caller as host.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/profile";
import { createTournamentSchema } from "@/lib/schemas/tournament";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateUniqueJoinCode } from "@/lib/tournament/join-code";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const parsed = createTournamentSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tournament" }, { status: 400 });
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
      hostId: auth.profile.id,
    },
    select: { id: true, code: true },
  });

  return NextResponse.json({ tournament }, { status: 201 });
}
