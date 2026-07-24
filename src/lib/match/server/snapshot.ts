/**
 * Pure mapping between a match's persisted rows and the reducer's MatchState:
 * timestamps ⇄ epoch ms, JSON ⇄ typed slot fields, current members in, slot
 * state back out as Prisma update data. No IO — the load/mutate seam calls in.
 */
import type { MatchView, ViewerRole } from "@/lib/match/client";
import type {
  MatchState,
  SlotPhase,
  SlotState,
  SlotWinner,
} from "@/lib/match/types";
import { MINIGAMES } from "@/lib/minigames/registry";
import type {
  MinigameKind,
  MinigameServer,
  RosterSnapshot,
} from "@/lib/minigames/types";

export interface SlotRow {
  ordinal: number;
  kind: MinigameKind;
  phase: SlotPhase;
  ready: string[];
  snapshot: unknown;
  countdownEndsAt: Date | null;
  deadline: Date | null;
  scoringEndsAt: Date | null;
  payload: unknown;
  normA: number | null;
  normB: number | null;
  winner: SlotWinner | null;
}

export interface MatchTeamRows {
  id: string;
  name: string;
  colorIndex: number;
  memberIds: string[];
}

export interface MatchRows {
  id: string;
  round: { drawnGames: MinigameKind[] };
  teamA: MatchTeamRows;
  teamB: MatchTeamRows | null;
  slots: SlotRow[];
}

export interface SlotUpdateData {
  phase: SlotPhase;
  ready: string[];
  snapshot: RosterSnapshot | null;
  countdownEndsAt: Date | null;
  deadline: Date | null;
  scoringEndsAt: Date | null;
  payload: unknown;
  normA: number | null;
  normB: number | null;
  winner: SlotWinner | null;
}

function toMs(date: Date | null): number | null {
  return date === null ? null : date.getTime();
}

function toDate(ms: number | null): Date | null {
  return ms === null ? null : new Date(ms);
}

export function rowsToMatchState(rows: MatchRows): MatchState {
  if (rows.teamB === null) {
    throw new Error(`Match ${rows.id} is a bye and has no playable state`);
  }
  const slots: SlotState[] = [...rows.slots]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((row) => ({
      ordinal: row.ordinal,
      kind: row.kind,
      phase: row.phase,
      ready: row.ready,
      snapshot: (row.snapshot as RosterSnapshot | null) ?? null,
      countdownEndsAt: toMs(row.countdownEndsAt),
      deadline: toMs(row.deadline),
      scoringEndsAt: toMs(row.scoringEndsAt),
      payload: row.payload ?? null,
      normA: row.normA,
      normB: row.normB,
      winner: row.winner,
    }));

  return {
    matchId: rows.id,
    seed: rows.id,
    teamA: {
      id: rows.teamA.id,
      name: rows.teamA.name,
      colorIndex: rows.teamA.colorIndex,
      members: rows.teamA.memberIds,
    },
    teamB: {
      id: rows.teamB.id,
      name: rows.teamB.name,
      colorIndex: rows.teamB.colorIndex,
      members: rows.teamB.memberIds,
    },
    slots,
  };
}

export function toMatchView(
  state: MatchState,
  opts: {
    viewerId: string | null;
    role: ViewerRole;
    labels: Record<string, string>;
    games?: Record<MinigameKind, MinigameServer>;
  },
): MatchView {
  // The audience seam: games with hidden info define redact and get their
  // payloads stripped per viewer before the snapshot leaves the server;
  // games without it (the stub) ship state whole.
  const games = opts.games ?? MINIGAMES;
  const redacted: MatchState = {
    ...state,
    slots: state.slots.map((slot) => {
      const game = games[slot.kind];
      if (!game.redact || slot.payload === null) return slot;
      return { ...slot, payload: game.redact(slot.payload, opts.viewerId) };
    }),
  };
  return {
    match: redacted,
    viewerId: opts.viewerId,
    role: opts.role,
    playerLabels: opts.labels,
  };
}

export function slotUpdateData(slot: SlotState): SlotUpdateData {
  return {
    phase: slot.phase,
    ready: slot.ready,
    snapshot: slot.snapshot,
    countdownEndsAt: toDate(slot.countdownEndsAt),
    deadline: toDate(slot.deadline),
    scoringEndsAt: toDate(slot.scoringEndsAt),
    payload: slot.payload,
    normA: slot.normA,
    normB: slot.normB,
    winner: slot.winner,
  };
}
