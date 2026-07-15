/**
 * Pure round-robin scheduling. buildSchedule pairs every team with every other
 * exactly once via the circle method, inserting one bye per round for an odd
 * field. Deterministic given the seed that fixes the initial team order; no IO.
 */

export interface ScheduledMatch {
  teamA: string;
  teamB: string | null; // null => teamA sits out this round (a bye)
}

export interface ScheduledRound {
  ordinal: number; // 1-based
  matches: ScheduledMatch[];
}

/** Rounds in a full single round-robin: N-1 for even N, N for odd N, 0 below 2. */
export function roundCountFor(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

/** A tournament is complete once every scheduled round has been played. */
export function isComplete(
  roundsCompleted: number,
  teamCount: number,
): boolean {
  const total = roundCountFor(teamCount);
  return total > 0 && roundsCompleted >= total;
}

// Mulberry32: a compact deterministic PRNG so a seed fixes the whole schedule.
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Placeholder opponent that turns a pairing into a bye for the real team.
const BYE = "__bye__";

export function buildSchedule(
  teamIds: string[],
  seed: number,
): ScheduledRound[] {
  if (teamIds.length < 2) return [];

  const players = seededShuffle(teamIds, seed);
  if (players.length % 2 !== 0) players.push(BYE);

  const n = players.length;
  const half = n / 2;
  let rotation = [...players];
  const rounds: ScheduledRound[] = [];

  for (let r = 0; r < n - 1; r++) {
    const matches: ScheduledMatch[] = [];
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      if (home === BYE) matches.push({ teamA: away, teamB: null });
      else if (away === BYE) matches.push({ teamA: home, teamB: null });
      else matches.push({ teamA: home, teamB: away });
    }
    rounds.push({ ordinal: r + 1, matches });

    // Fix the first slot; rotate the rest one step for the next round.
    const [fixed, ...rest] = rotation;
    rest.unshift(rest.pop() as string);
    rotation = [fixed, ...rest];
  }

  return rounds;
}
