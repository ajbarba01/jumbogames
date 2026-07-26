/**
 * The gated match read path: load a match, resolve the viewer's relation
 * through resolveViewer against the full tournament roster, and project the
 * audience-filtered MatchView. Reads are open to any signed-in user (decision
 * 16, spectate by link); the tournament roster only decides the player-vs-
 * spectator role within the match, not whether the viewer is admitted. A
 * missing match, a bye, or a URL whose tournament id does not match the match
 * all return null (caller -> 404); the caller's own auth check is what keeps
 * this route signed-in-only.
 */
import type { Role } from "@/generated/prisma/client";
import { rowsToMatchState, toMatchView } from "./snapshot";
import { loadMatchRows } from "./load";
import { resolveViewer, type ViewerRelation } from "@/lib/tournament/viewer";
import type { MatchView } from "@/lib/match/client";

export interface GatedMatchView {
  view: MatchView;
  relation: ViewerRelation;
}

export async function gateMatchView(
  tournamentId: string,
  matchId: string,
  viewer: { viewerId: string; viewerRole: Role },
): Promise<GatedMatchView | null> {
  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) return null;
  // Authorization derives from the match's own tournament; a mismatched
  // [id]/[matchId] pair is a lying URL and 404s rather than being accepted.
  if (loaded.tournamentId !== tournamentId) return null;

  const relation = resolveViewer({
    viewerId: viewer.viewerId,
    viewerRole: viewer.viewerRole,
    hostId: loaded.hostId,
    memberIds: [...loaded.tournamentMemberIds],
  });

  const state = rowsToMatchState(loaded.rows);
  const isPlayer = loaded.memberIds.has(viewer.viewerId);
  const view = toMatchView(state, {
    viewerId: isPlayer ? viewer.viewerId : null,
    role: isPlayer ? "player" : "spectator",
    labels: loaded.labels,
  });
  return { view, relation };
}
