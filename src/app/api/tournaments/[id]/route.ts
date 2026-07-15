/**
 * Route handler: read a tournament's current lobby/board state. Requires a
 * signed-in user and returns the shared state projection used across surfaces.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { getTournamentState, toLobbyDTO } from "@/lib/tournament/lobby";

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
  const state = await getTournamentState(id);
  if (!state) {
    return NextResponse.json({ error: "No such tournament" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toLobbyDTO(state) });
}
