/**
 * Internal route: writes a slot the Worker has finished back into Postgres and
 * settles round completion, reusing the same slot-write mapping and completion
 * guard the old mutate seam used. Idempotent — replaying the same completed
 * ordinal is a no-op — because the Worker retries this call on failure.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isInternalCaller } from "@/lib/realtime/internal-auth";
import { parseJsonBody } from "@/lib/http";
import { loadMatchRows } from "@/lib/match/server/load";
import { persistMatchState } from "@/lib/match/server/persist";
import type { MatchState } from "@jumbo/engine";
import type { PersistResponse } from "@jumbo/protocol";

const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorIndex: z.number().int(),
  members: z.array(z.string()),
});

const slotSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  kind: z.enum(["stub", "trivia"]),
  phase: z.enum([
    "upcoming",
    "gate",
    "countdown",
    "playing",
    "scoring",
    "done",
  ]),
  ready: z.array(z.string()),
  snapshot: z
    .object({ teamA: z.array(z.string()), teamB: z.array(z.string()) })
    .nullable(),
  countdownEndsAt: z.number().nullable(),
  deadline: z.number().nullable(),
  scoringEndsAt: z.number().nullable(),
  payload: z.unknown(),
  normA: z.number().nullable(),
  normB: z.number().nullable(),
  winner: z.enum(["A", "B", "tie"]).nullable(),
});

const persistRequestSchema = z.object({
  state: z.object({
    matchId: z.string(),
    seed: z.string(),
    teamA: teamSchema,
    teamB: teamSchema,
    slots: z.array(slotSchema),
  }),
  completedOrdinal: z.number().int().nonnegative(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  if (!isInternalCaller(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { matchId } = await ctx.params;

  const parsed = persistRequestSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Zod leaves an `unknown` payload optional; the reducer's SlotState requires
  // the key, and absent payload persists the same as an explicit null.
  const state: MatchState = {
    ...parsed.data.state,
    slots: parsed.data.state.slots.map((slot) => ({
      ...slot,
      payload: slot.payload ?? null,
    })),
  };

  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }

  await persistMatchState(matchId, state, {
    roundId: loaded.roundId,
    tournamentId: loaded.tournamentId,
  });

  return NextResponse.json({ ok: true } satisfies PersistResponse);
}
