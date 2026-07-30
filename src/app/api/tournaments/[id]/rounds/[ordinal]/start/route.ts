/**
 * Route handler: the host starts round N. Draws K games (seeded, per-round) from
 * the eligible pool and validates the draw before anything is persisted; only
 * then does it create the round's minigame slots and flip the round to active.
 * Sequential: only the earliest non-complete round starts.
 */
import { NextResponse } from "next/server";
import { requireUser, isGameHost } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { RoundState, TournamentPhase } from "@/generated/prisma/client";
import {
  checkContentReady,
  checkRoundDraw,
  drawRoundGames,
} from "@jumbo/engine";
import { eligibleEnv, eligiblePool } from "@jumbo/engine";
import { buildRoundSlots } from "@/lib/match/server/round-slots";
import { broadcastTournamentChange } from "@/lib/realtime/broadcast";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string; ordinal: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id, ordinal: ordinalParam } = await ctx.params;
  const ordinal = Number(ordinalParam);
  if (!Number.isInteger(ordinal)) {
    return NextResponse.json({ error: "Invalid round" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      hostId: true,
      phase: true,
      minigamesPerMatch: true,
      pool: true,
      rounds: {
        orderBy: { ordinal: "asc" },
        select: {
          id: true,
          ordinal: true,
          state: true,
          matches: { select: { id: true, teamBId: true } },
        },
      },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "No such game" }, { status: 404 });
  }
  if (!isGameHost(auth.profile, tournament.hostId)) {
    return NextResponse.json(
      { error: "Only the host can start a round" },
      { status: 403 },
    );
  }
  if (tournament.phase !== TournamentPhase.active) {
    return NextResponse.json(
      { error: "This game isn't running" },
      { status: 409 },
    );
  }

  const round = tournament.rounds.find((r) => r.ordinal === ordinal);
  if (!round) {
    return NextResponse.json({ error: "No such round" }, { status: 404 });
  }
  if (round.state !== RoundState.pending) {
    return NextResponse.json(
      { error: "That round has already started" },
      { status: 409 },
    );
  }
  const earliestIncomplete = tournament.rounds.find(
    (r) => r.state !== RoundState.complete,
  );
  if (!earliestIncomplete || earliestIncomplete.ordinal !== ordinal) {
    return NextResponse.json(
      { error: "Start the earlier round first" },
      { status: 409 },
    );
  }

  // A stored pool can go stale (a kind unregistered, or a dev-only kind on a
  // row now played in production). Intersecting means an unplayable pool
  // becomes an empty draw — which checkRoundDraw already turns into a 409 —
  // rather than an absent registry entry at play time.
  const drawnGames = drawRoundGames(
    eligiblePool(tournament.pool, eligibleEnv()),
    tournament.minigamesPerMatch,
    `${id}:${ordinal}`,
  );
  const drawCheck = checkRoundDraw(drawnGames, tournament.minigamesPerMatch);
  if (!drawCheck.ok) {
    return NextResponse.json({ error: drawCheck.reason }, { status: 409 });
  }
  const bankCount = drawnGames.includes("trivia")
    ? await prisma.triviaQuestion.count()
    : 0;
  const contentCheck = checkContentReady(drawnGames, bankCount);
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.reason }, { status: 409 });
  }
  const slots = buildRoundSlots(
    round.matches.map((m) => ({ id: m.id, isBye: m.teamBId === null })),
    drawnGames,
  );

  await prisma.$transaction([
    prisma.round.update({
      where: { id: round.id },
      data: {
        state: RoundState.active,
        drawnGames,
        startedAt: new Date(),
      },
    }),
    prisma.minigameSlot.createMany({ data: slots }),
  ]);

  await broadcastTournamentChange(id);
  return NextResponse.json({ ok: true });
}
