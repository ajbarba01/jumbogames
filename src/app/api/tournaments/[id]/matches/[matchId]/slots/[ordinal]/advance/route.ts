/**
 * Route handler: any attached client pings this when a slot's persisted deadline
 * has passed (countdown end, play deadline, scoring end). The server picks the
 * event from the slot's phase and time; duplicates and early pings no-op in the
 * reducer. This is the lazy enforcement serverless has no ticker for.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { loadMatchRows } from "@/lib/match/server/load";
import { mutateMatch } from "@/lib/match/server/mutate";
import { rowsToMatchState } from "@/lib/match/server/snapshot";
import { pendingAdvance } from "@/lib/match/timers";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ matchId: string; ordinal: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }
  const { matchId } = await ctx.params;

  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }
  // Attach check: only tournament participants may nudge timers. Spectators are
  // members of the tournament; for M4 (stub) membership on either team suffices,
  // and a non-participant simply gets a no-op-equivalent 403.
  if (!loaded.memberIds.has(auth.profile.id)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const state = rowsToMatchState(loaded.rows);
  const advance = pendingAdvance(state, Date.now());
  if (!advance) return NextResponse.json({ ok: true, changed: false });

  const result = await mutateMatch(matchId, advance.event);
  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true, changed: result.changed });
}
