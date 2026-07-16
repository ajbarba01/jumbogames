/**
 * Stub minigame: mash a button until the timer ends; a player's raw score is
 * their mash count. Exists to prove the minigame contract end-to-end before
 * any real game ships; devOnly keeps it out of production pools.
 */
import type { MinigameServer, RosterSnapshot } from "../types";

export interface StubState {
  counts: Record<string, number>;
}

export interface StubAction {
  type: "mash";
}

export const STUB_PLAY_SECONDS = 10;

export const stubGame: MinigameServer<StubState, StubAction> = {
  kind: "stub",
  title: "Button Masher",
  instructions:
    "Mash the button as fast as you can. Every press adds a point; your " +
    "team's score is the average across its players.",
  playSeconds: STUB_PLAY_SECONDS,
  devOnly: true,
  init(snapshot: RosterSnapshot): StubState {
    const counts: Record<string, number> = {};
    for (const id of [...snapshot.teamA, ...snapshot.teamB]) counts[id] = 0;
    return { counts };
  },
  apply(state, playerId, action) {
    if (action.type !== "mash") return state;
    const current = state.counts[playerId];
    if (current === undefined) return state;
    return { counts: { ...state.counts, [playerId]: current + 1 } };
  },
  isFinished() {
    return false;
  },
  scores(state) {
    return state.counts;
  },
};
