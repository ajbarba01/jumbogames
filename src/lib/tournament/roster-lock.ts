/**
 * The lock rule as a pure predicate (DESIGN decision 17): join, leave and
 * leader-kick are allowed only while a team has no live match — the lobby, or
 * between rounds. It is the same question the board already answers when it
 * routes a player into their match, so it reuses that resolver rather than
 * restating what "live" means. Slot roster snapshots make the boundary safe:
 * a roster change between rounds cannot reach a match that is already playing.
 *
 * Load-bearing beyond this module: the realtime Worker's MatchRoom hydrates a
 * match's roster once and never refreshes it, deciding `isPlayer` per
 * connection from that frozen copy. It is safe only while this predicate holds.
 * Anything that lets a roster change land during a live match — a mid-match
 * leave, a kick that ignores the lock — must apply the engine's `rosterChanged`
 * event in the Worker first, or a removed player keeps playing.
 */
import { resolveViewerMatchId, type PlacementMatch } from "./placement";

/** The status-vocabulary reason a locked team gives, shared by API and UI. */
export const ROSTER_LOCKED_MESSAGE = "In a match — opens after this round";

export function isTeamLocked(
  matches: readonly PlacementMatch[],
  teamId: string,
): boolean {
  return resolveViewerMatchId(matches, teamId) !== null;
}
