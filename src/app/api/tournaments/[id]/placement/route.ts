/**
 * Route handler: where does the caller belong in this tournament right now?
 * Returns a Placement — their live match, the board (a bye), or stay put.
 * Read-only. Clients poll this whenever the tournament channel broadcasts,
 * which happens both when a round starts and when a round completes; the
 * Placement result is what lets the client tell those two moments apart
 * instead of guessing from a bare match id. The server, not the client,
 * decides placement.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateTournamentRead } from "@/lib/tournament/lobby";
import { getBoardState } from "@/lib/tournament/board";
import { resolvePlacement } from "@/lib/tournament/placement";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const { id } = await ctx.params;
  const gated = await gateTournamentRead(id, {
    viewerId: auth.profile.id,
    viewerRole: auth.profile.role,
  });
  if (!gated) {
    return NextResponse.json({ error: "No such tournament" }, { status: 404 });
  }

  const board = await getBoardState(id, auth.profile.id);
  if (!board) {
    return NextResponse.json({ error: "No such tournament" }, { status: 404 });
  }

  return NextResponse.json(
    resolvePlacement(board.viewerMatchId, board.viewerBye),
  );
}
