/**
 * Resolves where a viewer belongs right now: the live match their team is
 * playing, the board on a bye, or nowhere (stay put). Pure: callers load
 * rounds and pass team membership in.
 */

export interface PlacementMatch {
  id: string;
  teamAId: string;
  teamBId: string | null;
  live: boolean;
}

// A viewer belongs in a match only as a player: teamId is their roster team,
// or null for the host, admins, and anyone not on a team. Byes have no live
// match and so resolve to null, which is the same "stay on the board" answer
// a non-member gets.
export function resolveViewerMatchId(
  matches: readonly PlacementMatch[],
  teamId: string | null,
): string | null {
  if (teamId === null) return null;
  return (
    matches.find(
      (m) => m.live && (m.teamAId === teamId || m.teamBId === teamId),
    )?.id ?? null
  );
}

// Where a viewer belongs right now, as a closed set rather than an
// overloaded null: a live match to enter, the board because their team has a
// bye this round, or nowhere at all.
export type Placement =
  { kind: "match"; matchId: string } | { kind: "board" } | { kind: "stay" };

// The viewer's own bye in the round being played now, if any — the same
// shape getBoardState resolves as BoardDTO.viewerBye. Only its null-ness
// matters to resolvePlacement; the fields ride along because callers (the
// board) need them too and this is the one place the shape is declared.
export type ActiveBye = { ordinal: number; minigames: number } | null;

// The tournament channel broadcasts both when a round starts and when a
// round completes, and a viewer with no live match looks identical in both
// moments — resolveViewerMatchId returns null either way. The viewer's own
// active bye (not a bare "is some round active" flag) is what tells them
// apart, because it is scoped to the viewer rather than the tournament: a
// rostered team sitting out the current round has one and belongs on the
// board, while anyone else with no live match — a spectator watching a match
// they aren't rostered on, a host or admin off the roster entirely, or
// everyone once the round completes (byes stop being active the moment their
// round does) — has none and must stay exactly where they are.
export function resolvePlacement(
  liveMatchId: string | null,
  activeBye: ActiveBye,
): Placement {
  if (liveMatchId !== null) return { kind: "match", matchId: liveMatchId };
  if (activeBye !== null) return { kind: "board" };
  return { kind: "stay" };
}
