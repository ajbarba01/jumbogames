/**
 * Internal route: hands the realtime Worker everything it needs to run a match
 * — the current state, the roster that decides player vs spectator, display
 * labels, and any per-kind init context loaded at the IO edge. Authenticated by
 * shared secret, not a user session; Prisma access stops here.
 */
import { NextResponse } from "next/server";
import { isInternalCaller } from "@/lib/realtime/internal-auth";
import { loadMatchRows } from "@/lib/match/server/load";
import { rowsToMatchState } from "@/lib/match/server/snapshot";
import { INIT_CONTEXT_LOADERS } from "@/lib/minigames/prepare";
import type { MinigameKind } from "@jumbo/engine";
import type { HydrateResponse } from "@jumbo/protocol";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  if (!isInternalCaller(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { matchId } = await ctx.params;

  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }

  const state = rowsToMatchState(loaded.rows);

  // Resolve init context for EVERY kind in the match, not only the slot that
  // happens to be gating right now. mutateMatch could load it per request; the
  // Durable Object hydrates once and then runs the whole match offline, so a
  // slot that gates later would otherwise init with no context at all — for
  // trivia that means an empty question bank and a match that deals no cards.
  const kinds = new Set<MinigameKind>(
    state.slots
      .map((slot) => slot.kind)
      .filter((kind) => Object.hasOwn(INIT_CONTEXT_LOADERS, kind)),
  );
  const initContext: Partial<Record<MinigameKind, unknown>> = {};
  await Promise.all(
    [...kinds].map(async (kind) => {
      const load = INIT_CONTEXT_LOADERS[kind];
      if (load) initContext[kind] = await load();
    }),
  );

  return NextResponse.json({
    state,
    hostId: loaded.hostId,
    tournamentId: loaded.tournamentId,
    memberIds: [...loaded.memberIds],
    labels: loaded.labels,
    initContext,
    serverNow: Date.now(),
  } satisfies HydrateResponse);
}
