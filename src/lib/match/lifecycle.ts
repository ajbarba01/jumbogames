/**
 * Pure match lifecycle reducer: applies typed events (ready-ups, roster
 * changes, timer elapses, game actions, finalize) to match state. No IO and
 * no wall clock — callers supply `now` and the minigame registry, so route
 * handlers, the fake dev client, and tests all drive the same machine.
 */
import type {
  MinigameKind,
  MinigameServer,
  RosterSnapshot,
} from "@/lib/minigames/types";
import { isGateSatisfied } from "./derive";
import { normalizeTeamScore } from "./normalize";
import {
  COUNTDOWN_SECONDS,
  SCORING_SECONDS,
  type MatchEvent,
  type MatchState,
  type MatchTeam,
  type SlotState,
  type SlotWinner,
} from "./types";

export interface MatchDeps {
  now: number;
  games: Record<MinigameKind, MinigameServer>;
}

export function createMatch(params: {
  matchId: string;
  seed: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  kinds: MinigameKind[];
}): MatchState {
  return {
    matchId: params.matchId,
    seed: params.seed,
    teamA: params.teamA,
    teamB: params.teamB,
    slots: params.kinds.map((kind, ordinal) => ({
      ordinal,
      kind,
      phase: ordinal === 0 ? "gate" : "upcoming",
      ready: [],
      snapshot: null,
      countdownEndsAt: null,
      deadline: null,
      scoringEndsAt: null,
      payload: null,
      normA: null,
      normB: null,
      winner: null,
    })),
  };
}

function replaceSlot(state: MatchState, slot: SlotState): MatchState {
  return {
    ...state,
    slots: state.slots.map((s) => (s.ordinal === slot.ordinal ? slot : s)),
  };
}

function startCountdown(
  state: MatchState,
  slot: SlotState,
  deps: MatchDeps,
): MatchState {
  const game = deps.games[slot.kind];
  const snapshot: RosterSnapshot = {
    teamA: [...state.teamA.members],
    teamB: [...state.teamB.members],
  };
  return replaceSlot(state, {
    ...slot,
    phase: "countdown",
    snapshot,
    countdownEndsAt: deps.now + COUNTDOWN_SECONDS * 1000,
    payload: game.init(snapshot, `${state.seed}:${slot.ordinal}`),
  });
}

export function applyMatchEvent(
  state: MatchState,
  event: MatchEvent,
  deps: MatchDeps,
): MatchState {
  switch (event.type) {
    case "playerReady": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "gate") return state;
      const isMember =
        state.teamA.members.includes(event.playerId) ||
        state.teamB.members.includes(event.playerId);
      if (!isMember || slot.ready.includes(event.playerId)) return state;
      const next = replaceSlot(state, {
        ...slot,
        ready: [...slot.ready, event.playerId],
      });
      const readied = next.slots[event.ordinal];
      return readied && isGateSatisfied(next, readied)
        ? startCountdown(next, readied, deps)
        : next;
    }
    case "hostForceStart": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "gate") return state;
      return startCountdown(state, slot, deps);
    }
    case "rosterChanged": {
      const next: MatchState = {
        ...state,
        teamA: { ...state.teamA, members: [...event.teamA] },
        teamB: { ...state.teamB, members: [...event.teamB] },
      };
      const gate = next.slots.find((s) => s.phase === "gate");
      if (!gate) return next;
      const members = new Set([...event.teamA, ...event.teamB]);
      const pruned = replaceSlot(next, {
        ...gate,
        ready: gate.ready.filter((id) => members.has(id)),
      });
      const slot = pruned.slots[gate.ordinal];
      return slot && isGateSatisfied(pruned, slot)
        ? startCountdown(pruned, slot, deps)
        : pruned;
    }
    case "countdownElapsed": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "countdown") return state;
      if (slot.countdownEndsAt === null || deps.now < slot.countdownEndsAt)
        return state;
      const game = deps.games[slot.kind];
      return replaceSlot(state, {
        ...slot,
        phase: "playing",
        deadline: deps.now + game.playSeconds * 1000,
      });
    }
    case "gameAction": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "playing" || slot.snapshot === null)
        return state;
      if (slot.deadline !== null && deps.now >= slot.deadline) return state;
      const inSnapshot =
        slot.snapshot.teamA.includes(event.playerId) ||
        slot.snapshot.teamB.includes(event.playerId);
      if (!inSnapshot) return state;
      const game = deps.games[slot.kind];
      return replaceSlot(state, {
        ...slot,
        payload: game.apply(slot.payload, event.playerId, event.action),
      });
    }
    case "finalize": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "playing" || slot.snapshot === null)
        return state;
      const game = deps.games[slot.kind];
      const timeUp = slot.deadline !== null && deps.now >= slot.deadline;
      if (!timeUp && !game.isFinished(slot.payload, deps.now)) return state;
      const raws = game.scores(slot.payload);
      const normA = normalizeTeamScore(raws, slot.snapshot.teamA);
      const normB = normalizeTeamScore(raws, slot.snapshot.teamB);
      const winner: SlotWinner =
        normA > normB ? "A" : normB > normA ? "B" : "tie";
      return replaceSlot(state, {
        ...slot,
        phase: "scoring",
        normA,
        normB,
        winner,
        scoringEndsAt: deps.now + SCORING_SECONDS * 1000,
      });
    }
    case "scoringElapsed": {
      const slot = state.slots[event.ordinal];
      if (!slot || slot.phase !== "scoring") return state;
      if (slot.scoringEndsAt === null || deps.now < slot.scoringEndsAt)
        return state;
      const done = replaceSlot(state, { ...slot, phase: "done" });
      const next = done.slots[event.ordinal + 1];
      return next ? replaceSlot(done, { ...next, phase: "gate" }) : done;
    }
  }
}
