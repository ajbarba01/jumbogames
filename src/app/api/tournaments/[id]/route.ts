/**
 * Route handler: read a tournament's current lobby/board state. Requires a
 * signed-in user and returns the shared state projection used across
 * surfaces. Reads are open to any signed-in user (decision 16, spectate by
 * link), but the join code is a write credential, not a read one — this
 * route carries no code query param, so only a host/member/admin gets it in
 * the payload (via holdsGameCode); everyone else sees `code: null`.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateTournamentRead, toLobbyDTO } from "@/lib/tournament/lobby";
import { holdsGameCode } from "@/lib/tournament/viewer";

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

  const includeCode = holdsGameCode(gated.relation, gated.state.code, null);
  return NextResponse.json({
    tournament: toLobbyDTO(gated.state, includeCode),
  });
}
