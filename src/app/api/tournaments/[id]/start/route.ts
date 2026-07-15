/**
 * Route handler: the host starts the tournament. Enforces host identity, a
 * minimum field, and all-teams-ready (unless the host overrides). On success it
 * freezes the roster by moving to the active phase, persists the full
 * round-robin schedule, and broadcasts the change.
 */
import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { requireAdmin } from "@/lib/auth/profile";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TournamentPhase } from "@/generated/prisma/client";
import {
  startTournamentSchema,
  MIN_TEAMS_TO_START,
} from "@/lib/schemas/tournament";
import { buildSchedule, roundCountFor } from "@/lib/tournament/schedule";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const parsed = startTournamentSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      hostId: true,
      phase: true,
      teams: { select: { id: true, readyAt: true } },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "No such tournament" }, { status: 404 });
  }
  if (tournament.hostId !== auth.profile.id) {
    return NextResponse.json(
      { error: "Only the host can start this tournament" },
      { status: 403 },
    );
  }
  if (tournament.phase !== TournamentPhase.lobby) {
    return NextResponse.json(
      { error: "This tournament has already started" },
      { status: 409 },
    );
  }

  const teams = tournament.teams;
  if (teams.length < MIN_TEAMS_TO_START) {
    return NextResponse.json(
      { error: `Need at least ${MIN_TEAMS_TO_START} teams to start` },
      { status: 409 },
    );
  }
  if (!parsed.data.override && teams.some((team) => team.readyAt === null)) {
    return NextResponse.json(
      { error: "Not all teams are ready" },
      { status: 409 },
    );
  }

  const seed = randomInt(0, 0x100000000);
  const rounds = buildSchedule(
    teams.map((team) => team.id),
    seed,
  );

  await prisma.$transaction([
    ...rounds.map((round) =>
      prisma.round.create({
        data: {
          tournamentId: id,
          ordinal: round.ordinal,
          matches: {
            create: round.matches.map((match) => ({
              teamAId: match.teamA,
              teamBId: match.teamB,
            })),
          },
        },
      }),
    ),
    prisma.tournament.update({
      where: { id },
      data: {
        phase: TournamentPhase.active,
        roundCount: roundCountFor(teams.length),
        startedAt: new Date(),
      },
    }),
  ]);

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
