/**
 * Route handler: the audience-filtered match snapshot for the caller. The
 * RealtimeMatchClient seeds from the server render and refetches here on every
 * change ping and on reconnect. Role is resolved server-side from membership.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateMatchView } from "@/lib/match/server/read";

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
  const { id, matchId } = await ctx.params;
  const gated = await gateMatchView(id, matchId, {
    viewerId: auth.profile.id,
    viewerRole: auth.profile.role,
  });
  if (!gated) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }
  return NextResponse.json(gated.view);
}
