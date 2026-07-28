/**
 * Route handler: mints a fresh match-socket ticket for the caller. The client
 * calls this on reconnect, when the ticket that shipped with the page render
 * has expired. Authorization is the same gate the snapshot read uses — reads
 * are open to any signed-in user (DESIGN.md decision 16).
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateMatchView } from "@/lib/match/server/read";
import { issueTicket, socketUrlFor } from "@/lib/realtime/ticket";

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
  return NextResponse.json({
    ticket: await issueTicket(matchId, auth.profile.id),
    socketUrl: socketUrlFor(matchId),
  });
}
