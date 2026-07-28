/**
 * Valid MatchState builders for the Worker's tests. Real values rather than
 * casts, so the reducer actually runs against them — a cast fixture passes the
 * type checker and then throws the moment applyMatchEvent touches a team.
 */
import type { MatchState, SlotState } from "@jumbo/engine";

export const slot = (over: Partial<SlotState> = {}): SlotState => ({
  ordinal: 0,
  kind: "stub",
  phase: "upcoming",
  ready: [],
  snapshot: null,
  countdownEndsAt: null,
  deadline: null,
  scoringEndsAt: null,
  payload: null,
  normA: null,
  normB: null,
  winner: null,
  ...over,
});

export const matchState = (slots: SlotState[] = [slot()]): MatchState => ({
  matchId: "m1",
  seed: "seed-1",
  teamA: { id: "ta", name: "Team A", colorIndex: 0, members: ["p1"] },
  teamB: { id: "tb", name: "Team B", colorIndex: 1, members: ["p2"] },
  slots,
});
