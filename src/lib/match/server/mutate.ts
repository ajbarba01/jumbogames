/**
 * The single write seam for a match: load rows, apply one typed event through
 * the pure reducer, and — only if state changed — claim the write with a
 * match-level optimistic version bump, persist all slots, settle round
 * completion, and broadcast. Idempotent events return changed:false with no IO.
 */
import { prisma } from "@/lib/prisma";
import { MINIGAMES } from "@/lib/minigames/registry";
import { INIT_CONTEXT_LOADERS } from "@/lib/minigames/prepare";
import { applyMatchEvent } from "@/lib/match/lifecycle";
import { derivePhase } from "@/lib/match/derive";
import type { MinigameKind } from "@/lib/minigames/types";
import type { MatchEvent } from "@/lib/match/types";
import {
  broadcastMatchChange,
  broadcastTournamentChange,
} from "@/lib/realtime/broadcast";
import { Prisma, RoundState } from "@/generated/prisma/client";
import type { SlotState } from "@/lib/match/types";
import { loadMatchRows } from "./load";
import { rowsToMatchState, slotUpdateData } from "./snapshot";

const MAX_RETRIES = 4;

export type MutateResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "not-found" | "conflict" };

// Prisma nullable Json fields reject a literal null — absence is Prisma.DbNull
// (SQL NULL, read back as JS null). Non-null values pass through as JSON.
function slotWriteData(slot: SlotState): Prisma.MinigameSlotUpdateInput {
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

export async function mutateMatch(
  matchId: string,
  event: MatchEvent,
  opts: { now?: number } = {},
): Promise<MutateResult> {
  const now = opts.now ?? Date.now();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const loaded = await loadMatchRows(matchId);
    if (!loaded || loaded.rows.teamB === null) {
      return { ok: false, reason: "not-found" };
    }

    const state = rowsToMatchState(loaded.rows);

    const gatingKinds = new Set<MinigameKind>(
      state.slots
        .filter((slot) => slot.phase === "gate")
        .map((slot) => slot.kind)
        .filter((kind) => kind in INIT_CONTEXT_LOADERS),
    );
    const initContext: Partial<Record<MinigameKind, unknown>> = {};
    await Promise.all(
      [...gatingKinds].map(async (kind) => {
        initContext[kind] = await INIT_CONTEXT_LOADERS[kind]!();
      }),
    );

    const next = applyMatchEvent(state, event, {
      now,
      games: MINIGAMES,
      initContext,
    });
    if (next === state) return { ok: true, changed: false };

    // Interactive transaction (unlike the lobby handlers' single-shot batches):
    // the pg adapter pins one connection for its duration, which the pooler
    // supports in transaction mode, and it's the only way to make the version
    // claim and the slot writes commit as one atomic unit — see review notes.
    const claimed = await prisma.$transaction(async (tx): Promise<boolean> => {
      // Claim the write: bump the version only if it is still what we read.
      const claim = await tx.match.updateMany({
        where: { id: matchId, version: loaded.version },
        data: { version: { increment: 1 } },
      });
      if (claim.count === 0) return false; // lost the race.

      await Promise.all(
        next.slots.map((slot) =>
          tx.minigameSlot.update({
            where: { matchId_ordinal: { matchId, ordinal: slot.ordinal } },
            data: slotWriteData(slot),
          }),
        ),
      );
      return true;
    });
    if (!claimed) continue; // lost the race — reload and re-apply.

    await broadcastMatchChange(matchId);
    if (derivePhase(next).kind === "complete") {
      await settleRoundCompletion(loaded.roundId, loaded.tournamentId);
    }
    return { ok: true, changed: true };
  }

  return { ok: false, reason: "conflict" };
}

// A round completes when every non-bye match's final slot is done. Guarded so a
// duplicate completing mutation is a no-op.
async function settleRoundCompletion(
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
