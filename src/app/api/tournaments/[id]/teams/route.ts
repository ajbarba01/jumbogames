/**
 * Route handler: a signed-in player creates a team in a tournament's lobby,
 * becoming its leader and first member. Assigns the next free palette color and
 * rejects a player who is already on a team or a full/duplicate-name tournament.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { parseJsonBody } from "@/lib/http";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { createTeamSchema } from "@/lib/schemas/tournament";
import { requireLobby } from "@/lib/tournament/access";
import { pickColorIndex } from "@/lib/tournament/team-color";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const { id } = await ctx.params;
  const parsed = createTeamSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team name" }, { status: 400 });
  }

  const lobby = await requireLobby(id);
  if (!lobby.ok) {
    return NextResponse.json({ error: lobby.error }, { status: lobby.status });
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

  const teams = await prisma.team.findMany({
    where: { tournamentId: id },
    select: { colorIndex: true },
  });
  const colorIndex = pickColorIndex(teams.map((team) => team.colorIndex));
  if (colorIndex === null) {
    return NextResponse.json(
      { error: "This tournament is full" },
      { status: 409 },
    );
  }

  try {
    const team = await prisma.team.create({
      data: {
        tournamentId: id,
        name: parsed.data.name,
        leaderId: auth.profile.id,
        colorIndex,
        members: { create: { tournamentId: id, profileId: auth.profile.id } },
      },
      select: { id: true },
    });
    await broadcastTournamentChange(id);
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "That team name is taken" },
        { status: 409 },
      );
    }
    throw error;
  }
}
