/**
 * The match read path: load a match's rows and project the audience-filtered
 * MatchView for a viewer. Role is resolved from membership — a member of either
 * team is a player; anyone else viewing is a spectator.
 */
import { rowsToMatchState, toMatchView } from "./snapshot";
import { loadMatchRows } from "./load";
import type { MatchView } from "@/lib/match/client";

export async function getMatchView(
  matchId: string,
  profileId: string,
): Promise<MatchView | null> {
  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) return null;
  const state = rowsToMatchState(loaded.rows);
  const isPlayer = loaded.memberIds.has(profileId);
  return toMatchView(state, {
    viewerId: isPlayer ? profileId : null,
    role: isPlayer ? "player" : "spectator",
    labels: loaded.labels,
  });
}
