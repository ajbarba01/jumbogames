/**
 * Internal route: writes the match state the Worker holds back into Postgres
 * and settles round completion, reusing the same slot-write mapping and
 * completion guard the old mutate seam used. Every call overwrites all slots
 * wholesale rather than applying a delta, so a retry — which the Worker does on
 * failure — converges on the same rows; it is not free, though, as it rewrites
 * and re-broadcasts. The Worker, not this route, decides when to call.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isInternalCaller } from "@/lib/realtime/internal-auth";
import { parseJsonBody } from "@/lib/http";
import { loadMatchRows } from "@/lib/match/server/load";
import { persistMatchState } from "@/lib/match/server/persist";
import { MINIGAMES } from "@jumbo/engine";
import type { MatchState, MinigameKind, SlotPhase } from "@jumbo/engine";
import type { PersistResponse } from "@jumbo/protocol";

// Derived, not restated: adding a minigame kind widens MinigameKind, and a
// hand-written enum here would still typecheck while 400ing the new kind at
// runtime — finished matches silently failing to archive.
// hasOwnProperty, not `in`: `in` walks the prototype chain, so "constructor"
// and every other Object.prototype key would pass as a kind.
const kindSchema = z.custom<MinigameKind>(
  (value) =>
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MINIGAMES, value),
);

// SlotPhase has no runtime counterpart in the engine, so this table is the
// nearest equivalent: adding a phase to SlotPhase makes this literal a missing-
// key type error, which is the build signal a bare z.enum would not give.
const PHASES: Record<SlotPhase, true> = {
  upcoming: true,
  gate: true,
  countdown: true,
  playing: true,
  scoring: true,
  done: true,
};

const phaseSchema = z.custom<SlotPhase>(
  (value) => typeof value === "string" && value in PHASES,
);

const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorIndex: z.number().int(),
  members: z.array(z.string()),
});

const slotSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  kind: kindSchema,
  phase: phaseSchema,
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

  // The slot values come from the body but the rows are keyed by the URL's
  // matchId, so a Worker addressing the wrong room would write one match's
  // play into another. MatchState carries its own id; make them agree.
  if (state.matchId !== matchId) {
    return NextResponse.json({ error: "Match id mismatch" }, { status: 400 });
  }

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
