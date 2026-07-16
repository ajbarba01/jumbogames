/**
 * Core match-container state: a match is K minigame slots walked in order.
 * Slots are the single source of truth — matches store no phase of their
 * own. Presentation-only phases (reveal, zoom) live client-side.
 */
import type { MinigameKind, RosterSnapshot } from "@/lib/minigames/types";

export type SlotPhase =
  "upcoming" | "gate" | "countdown" | "playing" | "scoring" | "done";

export type SlotWinner = "A" | "B" | "tie";

export const COUNTDOWN_SECONDS = 3;
export const SCORING_SECONDS = 5;

export interface SlotState {
  ordinal: number;
  kind: MinigameKind;
  phase: SlotPhase;
  ready: string[];
  snapshot: RosterSnapshot | null;
  countdownEndsAt: number | null;
  deadline: number | null;
  scoringEndsAt: number | null;
  payload: unknown;
  normA: number | null;
  normB: number | null;
  winner: SlotWinner | null;
}

export interface MatchTeam {
  id: string;
  name: string;
  colorIndex: number;
  members: string[];
}

export interface MatchState {
  matchId: string;
  seed: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  slots: SlotState[];
}

export type MatchEvent =
  | { type: "playerReady"; ordinal: number; playerId: string }
  | { type: "hostForceStart"; ordinal: number }
  | { type: "rosterChanged"; teamA: string[]; teamB: string[] }
  | { type: "countdownElapsed"; ordinal: number }
  | { type: "gameAction"; ordinal: number; playerId: string; action: unknown }
  | { type: "finalize"; ordinal: number }
  | { type: "scoringElapsed"; ordinal: number };
