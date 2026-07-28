/**
 * Pure standings computation. Ranks teams by total minigames won (bye credit
 * included) and reports movement against a previous ranking. Teams level on
 * wins share a rank; those sharing a rank are marked tied only if they have
 * actually won something — a shared 0 is the starting state, not a contested
 * result, so it is left unmarked. There is no automated tiebreak among teams
 * that are marked, so a decider is the room's call (DESIGN decision 24). No
 * IO: route handlers pass the result set in.
 */
import type { SlotWinner } from "@jumbo/engine";

export interface MinigameOutcome {
  teamA: string;
  teamB: string;
  // The slot's recorded verdict, already resolved by the engine's finalize
  // step with any game-declared outcome applied. Never re-derived here: a
  // Tug O' Lore rope pin can hand the slot to the lower normalized mean.
  winner: SlotWinner;
}

export interface ByeAward {
  team: string;
  minigames: number; // minigame wins credited for sitting out
}

export interface StandingsInput {
  teams: string[]; // every team, so those without results still rank
  outcomes: MinigameOutcome[];
  byes?: ByeAward[];
  previousRanking?: string[]; // team ids in prior rank order (rank 1 first)
}

export interface StandingRow {
  team: string;
  minigamesWon: number;
  rank: number; // 1-based; teams level on wins share a number
  tied: boolean; // another team shares this rank AND both have won something
  movement: number; // previous rank - current rank (positive = climbed)
}

export function computeStandings(input: StandingsInput): StandingRow[] {
  const won = new Map<string, number>();
  for (const team of input.teams) won.set(team, 0);

  for (const o of input.outcomes) {
    if (o.winner === "A") won.set(o.teamA, (won.get(o.teamA) ?? 0) + 1);
    else if (o.winner === "B") won.set(o.teamB, (won.get(o.teamB) ?? 0) + 1);
  }

  for (const bye of input.byes ?? []) {
    won.set(bye.team, (won.get(bye.team) ?? 0) + bye.minigames);
  }

  const previousRank = new Map<string, number>();
  (input.previousRanking ?? []).forEach((team, i) =>
    previousRank.set(team, i + 1),
  );

  // Sorted on wins alone. Array.prototype.sort is stable, so teams level on
  // wins keep the caller's order — team creation order, which is what the
  // lobby shows — rather than an arbitrary id comparison.
  const ordered = [...input.teams].sort(
    (a, b) => (won.get(b) ?? 0) - (won.get(a) ?? 0),
  );

  // Competition ranking: equal wins share the lower number, and the next rank
  // skips the places the tied group consumed (1, 2, 2, 4).
  const rankByTeam = new Map<string, number>();
  ordered.forEach((team, i) => {
    const prior = i > 0 ? ordered[i - 1] : null;
    const levelWithPrior = prior !== null && won.get(prior) === won.get(team);
    rankByTeam.set(
      team,
      levelWithPrior ? (rankByTeam.get(prior) as number) : i + 1,
    );
  });

  const shareCount = new Map<number, number>();
  for (const rank of rankByTeam.values()) {
    shareCount.set(rank, (shareCount.get(rank) ?? 0) + 1);
  }

  return ordered.map((team) => {
    const rank = rankByTeam.get(team) as number;
    const prior = previousRank.get(team);
    return {
      team,
      minigamesWon: won.get(team) ?? 0,
      rank,
      // A shared rank at zero wins is the starting state, not a contested
      // result, so it is not marked tied.
      tied: (shareCount.get(rank) ?? 0) > 1 && (won.get(team) ?? 0) > 0,
      movement: prior === undefined ? 0 : prior - rank,
    };
  });
}
