/**
 * Pure standings computation. Ranks teams by total minigames won (bye credit
 * included), breaking ties on cumulative normalized score, and reports movement
 * against a previous ranking. No IO: route handlers pass in the result set.
 */

export interface MinigameOutcome {
  teamA: string;
  teamB: string;
  normA: number; // normalized team score for A in this minigame
  normB: number;
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
  cumulativeNormalized: number;
  rank: number; // 1-based
  movement: number; // previous rank - current rank (positive = climbed)
}

export function computeStandings(input: StandingsInput): StandingRow[] {
  const won = new Map<string, number>();
  const normalized = new Map<string, number>();
  for (const team of input.teams) {
    won.set(team, 0);
    normalized.set(team, 0);
  }

  for (const o of input.outcomes) {
    normalized.set(o.teamA, (normalized.get(o.teamA) ?? 0) + o.normA);
    normalized.set(o.teamB, (normalized.get(o.teamB) ?? 0) + o.normB);
    if (o.normA > o.normB) won.set(o.teamA, (won.get(o.teamA) ?? 0) + 1);
    else if (o.normB > o.normA) won.set(o.teamB, (won.get(o.teamB) ?? 0) + 1);
  }

  for (const bye of input.byes ?? []) {
    won.set(bye.team, (won.get(bye.team) ?? 0) + bye.minigames);
  }

  const previousRank = new Map<string, number>();
  (input.previousRanking ?? []).forEach((team, i) =>
    previousRank.set(team, i + 1),
  );

  const ordered = [...input.teams].sort((a, b) => {
    const byWins = (won.get(b) ?? 0) - (won.get(a) ?? 0);
    if (byWins !== 0) return byWins;
    const byNorm = (normalized.get(b) ?? 0) - (normalized.get(a) ?? 0);
    if (byNorm !== 0) return byNorm;
    return a.localeCompare(b); // deterministic final tiebreak
  });

  return ordered.map((team, i) => {
    const rank = i + 1;
    const prior = previousRank.get(team);
    return {
      team,
      minigamesWon: won.get(team) ?? 0,
      cumulativeNormalized: normalized.get(team) ?? 0,
      rank,
      movement: prior === undefined ? 0 : prior - rank,
    };
  });
}
