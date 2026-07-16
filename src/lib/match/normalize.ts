/**
 * Per-player normalization placeholder: a team's score is the mean of its
 * snapshot members' raw scores, so team size cancels out. Milestone 6 owns
 * the real per-game normalization utilities.
 */
export function normalizeTeamScore(
  raws: Record<string, number>,
  snapshotMembers: string[],
): number {
  if (snapshotMembers.length === 0) return 0;
  const total = snapshotMembers.reduce((sum, id) => sum + (raws[id] ?? 0), 0);
  return total / snapshotMembers.length;
}
