/**
 * sessionStorage marker recording that this tab already auto-navigated the
 * player into a given match — shared by the board's auto-pull and the match
 * page's round-start force-yield, so neither re-triggers a navigation the
 * player already received, including after a deliberate back-navigation to
 * the board. Backed by a module-level Set whenever storage throws: without it,
 * a player pulled into their match who presses back would be yanked straight
 * back in on every remount — an inescapable loop, which is worse than the
 * marker simply not surviving a hard reload. The Set is this module's only
 * state, so it survives the client-side remounts auto-pull's guard needs to
 * span, and degrades no worse than a fresh sessionStorage would across a
 * full page reload.
 */
"use client";

const MATCH_ENTERED_KEY_PREFIX = "jumbogames:match-entered:";
const enteredFallback = new Set<string>();

function matchEnteredKey(matchId: string): string {
  return `${MATCH_ENTERED_KEY_PREFIX}${matchId}`;
}

export function wasMatchEntered(matchId: string): boolean {
  try {
    return sessionStorage.getItem(matchEnteredKey(matchId)) !== null;
  } catch {
    return enteredFallback.has(matchId);
  }
}

export function markMatchEntered(matchId: string): void {
  try {
    sessionStorage.setItem(matchEnteredKey(matchId), "1");
  } catch {
    enteredFallback.add(matchId);
  }
}
