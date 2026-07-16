/**
 * The gated match read path: load a match, admit the viewer through
 * resolveViewer against the full tournament roster, and project the
 * audience-filtered MatchView. Access uses the tournament roster so any team
 * can spectate (DESIGN.md line 29); the player-vs-spectator role still uses the
 * match's own two teams. A missing match, a bye, a URL whose tournament id does
 * not match the match, or a refused viewer all return null (caller -> 404).
 */
import type { Role } from "@/generated/prisma/client";
import { rowsToMatchState, toMatchView } from "./snapshot";
import { loadMatchRows } from "./load";
import { resolveViewer, type ViewerRelation } from "@/lib/tournament/viewer";
import type { MatchView } from "@/lib/match/client";

export interface GatedMatchView {
  view: MatchView;
  relation: Extract<ViewerRelation, { allowed: true }>;
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
    // A match exists only after the tournament has started, so it is never
    // joinable — match reads are always strictly membership-gated.
    joinable: false,
  });
  if (!relation.allowed) return null;

  const state = rowsToMatchState(loaded.rows);
  const isPlayer = loaded.memberIds.has(viewer.viewerId);
  const view = toMatchView(state, {
    viewerId: isPlayer ? viewer.viewerId : null,
    role: isPlayer ? "player" : "spectator",
    labels: loaded.labels,
  });
  return { view, relation };
}
