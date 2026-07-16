/**
 * Route handler: the caller readies themselves for a slot's gate. Membership is
 * required (spectators cannot ready); the reducer ignores non-members and
 * duplicates, so this stays a thin authorize-then-dispatch.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { loadMatchRows } from "@/lib/match/server/load";
import { mutateMatch } from "@/lib/match/server/mutate";

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
  const { matchId, ordinal: ordinalParam } = await ctx.params;
  const ordinal = Number(ordinalParam);
  if (!Number.isInteger(ordinal)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }
  if (!loaded.memberIds.has(auth.profile.id)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const result = await mutateMatch(matchId, {
    type: "playerReady",
    ordinal,
    playerId: auth.profile.id,
  });
  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
