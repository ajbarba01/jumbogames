/**
 * Per-player normalization: a team's score for a slot is the mean of its
 * frozen snapshot members' raw scores, so team size cancels and a 3-person
 * team competes fairly against a 6-person one. This is the finished contract,
 * not a placeholder.
 *
 * It decides the slot for any minigame that declares no `outcome`; a game that
 * does declare one (Tug O' Lore's rope) overrides it at finalize. It
 * deliberately does not aggregate across minigames: different games score on
 * different scales (DESIGN decision 22), and with no standings tiebreak there
 * is nothing to sum and no cross-game unit to define.
 */
export function normalizeTeamScore(
  raws: Record<string, number>,
  snapshotMembers: string[],
): number {
  if (snapshotMembers.length === 0) return 0;
  const total = snapshotMembers.reduce((sum, id) => sum + (raws[id] ?? 0), 0);
  return total / snapshotMembers.length;
}
