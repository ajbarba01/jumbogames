/**
 * Bye bookkeeping — which teams sat out, what that is worth, and whether
 * the viewer is sitting out right now. Pure: callers pass data in.
 */
import type { ByeAward } from "./standings";

export interface ByeRound {
  ordinal: number;
  state: "pending" | "active" | "complete";
  matches: readonly { teamAId: string; teamBId: string | null }[];
}

// A bye is worth a full match's minigames — the same constant every team
// collects, since the circle-method schedule gives each team exactly one bye.
// Credited only once its round is complete: a team has not sat a round out
// until the round is over. Credit lands on wins, never on the normalized
// tiebreak, so it cannot inflate a team past a team that actually played.
export function collectByeAwards(
  rounds: readonly ByeRound[],
  minigamesPerMatch: number,
): ByeAward[] {
  const awards: ByeAward[] = [];
  for (const round of rounds) {
    if (round.state !== "complete") continue;
    for (const match of round.matches) {
      if (match.teamBId === null) {
        awards.push({ team: match.teamAId, minigames: minigamesPerMatch });
      }
    }
  }
  return awards;
}

// The viewer's bye in the round being played right now, if any. Only the
// active round is reported: a pending round has not happened yet, and a
// complete one is already reflected in the standings.
export function findActiveBye(
  rounds: readonly ByeRound[],
  teamId: string | null,
): { ordinal: number } | null {
  if (teamId === null) return null;
  const active = rounds.find((r) => r.state === "active");
  if (!active) return null;
  const sittingOut = active.matches.some(
    (m) => m.teamBId === null && m.teamAId === teamId,
  );
  return sittingOut ? { ordinal: active.ordinal } : null;
}
