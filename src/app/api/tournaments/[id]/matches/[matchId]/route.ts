/**
 * Route handler: the audience-filtered match snapshot for the caller. The
 * RealtimeMatchClient seeds from the server render and refetches here on every
 * change ping and on reconnect. Role is resolved server-side from membership.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateMatchView } from "@/lib/match/server/read";
import type { MatchSnapshotPayload } from "@/lib/match/client";
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
  // Minted only when the socket transport is the one that will actually run.
  // Both helpers throw on missing realtime config, and this route is on the
  // Supabase path's hot loop — an unconfigured environment must not turn every
  // match read into a 500 for a credential that path never uses.
  const useSocket = process.env.NEXT_PUBLIC_REALTIME_WS === "1";
  return NextResponse.json({
    view: gated.view,
    serverNow: Date.now(),
    ticket: useSocket ? await issueTicket(matchId, auth.profile.id) : "",
    socketUrl: useSocket ? socketUrlFor(matchId) : "",
  } satisfies MatchSnapshotPayload);
}
