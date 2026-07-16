/**
 * Route handler: the audience-filtered match snapshot for the caller. The
 * RealtimeMatchClient seeds from the server render and refetches here on every
 * change ping and on reconnect. Role is resolved server-side from membership.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { getMatchView } from "@/lib/match/server/read";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; matchId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }
  const { matchId } = await ctx.params;
  const view = await getMatchView(matchId, auth.profile.id);
  if (!view) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }
  return NextResponse.json(view);
}
