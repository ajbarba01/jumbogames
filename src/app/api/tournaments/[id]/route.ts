/**
 * Route handler: read a tournament's current lobby/board state. Requires a
 * signed-in user and returns the shared state projection used across surfaces.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { gateTournamentRead, toLobbyDTO } from "@/lib/tournament/lobby";

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

  return NextResponse.json({ tournament: toLobbyDTO(gated.state) });
}
