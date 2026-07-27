/**
 * The Postgres write half of a match: map slot state onto Prisma update data,
 * write every slot, and settle round completion. Shared by the legacy mutate
 * seam and the internal persist route the realtime Worker calls, so the two
 * cannot drift in how a finished slot lands.
 */
import { prisma } from "@/lib/prisma";
import { derivePhase } from "@jumbo/engine";
import type { MatchState, SlotState } from "@jumbo/engine";
import {
  broadcastMatchChange,
  broadcastTournamentChange,
} from "@/lib/realtime/broadcast";
import { Prisma, RoundState } from "@/generated/prisma/client";
import { slotUpdateData } from "./snapshot";

// Prisma nullable Json fields reject a literal null — absence is Prisma.DbNull
// (SQL NULL, read back as JS null). Non-null values pass through as JSON.
export function slotWriteData(slot: SlotState): Prisma.MinigameSlotUpdateInput {
  const d = slotUpdateData(slot);
  return {
    phase: d.phase,
    ready: d.ready,
    countdownEndsAt: d.countdownEndsAt,
    deadline: d.deadline,
    scoringEndsAt: d.scoringEndsAt,
    normA: d.normA,
    normB: d.normB,
    winner: d.winner,
    snapshot:
      d.snapshot === null
        ? Prisma.DbNull
        : (d.snapshot as unknown as Prisma.InputJsonValue),
    payload:
      d.payload === null || d.payload === undefined
        ? Prisma.DbNull
        : (d.payload as Prisma.InputJsonValue),
  };
}

// A round completes when every non-bye match's final slot is done. Guarded so a
// duplicate completing mutation is a no-op.
export async function settleRoundCompletion(
  roundId: string,
  tournamentId: string,
): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      state: true,
      matches: {
        select: {
          teamBId: true,
          slots: {
            select: { phase: true },
            orderBy: { ordinal: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!round || round.state === RoundState.complete) return;

  const allDone = round.matches.every(
    (match) => match.teamBId === null || match.slots[0]?.phase === "done",
  );
  if (!allDone) return;

  // Guarded flip: only the caller that actually transitions the round to
  // complete broadcasts, so two concurrently-completing matches don't both
  // fire a duplicate tournament broadcast.
  const flipped = await prisma.round.updateMany({
    where: { id: roundId, state: { not: RoundState.complete } },
    data: { state: RoundState.complete },
  });
  if (flipped.count > 0) {
    await broadcastTournamentChange(tournamentId);
  }
}

export async function persistMatchState(
  matchId: string,
  state: MatchState,
  ids: { roundId: string; tournamentId: string },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      state.slots.map((slot) =>
        tx.minigameSlot.update({
          where: { matchId_ordinal: { matchId, ordinal: slot.ordinal } },
          data: slotWriteData(slot),
        }),
      ),
    );
  });
  await broadcastMatchChange(matchId);
  if (derivePhase(state).kind === "complete") {
    await settleRoundCompletion(ids.roundId, ids.tournamentId);
  }
}
