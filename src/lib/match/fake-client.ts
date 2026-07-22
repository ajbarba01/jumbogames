/**
 * In-memory MatchClient driving the pure lifecycle reducer with timers and
 * scripted bot opponents — the /mockup event source. Swapping this class for
 * the Realtime-backed client is the entire backend integration seam.
 */
import { MINIGAMES, poolFor } from "@/lib/minigames/registry";
import type { MatchClient, MatchView, ViewerRole } from "./client";
import { derivePhase } from "./derive";
import { applyMatchEvent, createMatch } from "./lifecycle";
import { drawRoundGames } from "./round-draw";
import type { MatchEvent, MatchState } from "./types";

const TICK_MS = 150;
const BOT_READY_STAGGER_MS = 400;
const BOT_NAMES = [
  "Ada",
  "Grace",
  "Alan",
  "Edsger",
  "Barbara",
  "Donald",
  "Radia",
  "Ken",
];

export interface FakeMatchConfig {
  k: number;
  role: ViewerRole;
  botsPerTeam: number;
  botReadyDelayMs: number;
  botMashIntervalMs: number;
}

export class FakeMatchClient implements MatchClient {
  private state: MatchState;
  private view: MatchView;
  private readonly listeners = new Set<() => void>();
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly labels: Record<string, string> = {};
  private readonly lastMash = new Map<string, number>();
  private gateOrdinal: number | null = null;
  private gateEnteredAt = 0;
  private botCounter = 0;
  private readonly config: FakeMatchConfig;

  constructor(config: FakeMatchConfig) {
    this.config = config;
    const viewerId = config.role === "player" ? "you" : null;
    if (viewerId !== null) this.labels[viewerId] = "You";
    const membersA = viewerId !== null ? [viewerId] : [];
    const membersB: string[] = [];
    for (let i = 0; i < config.botsPerTeam; i++) {
      membersA.push(this.newBot());
      membersB.push(this.newBot());
    }
    this.state = createMatch({
      matchId: "mock-match",
      seed: "mock",
      teamA: {
        id: "team-a",
        name: "Jumbones",
        colorIndex: 1,
        members: membersA,
      },
      teamB: {
        id: "team-b",
        name: "Sardines",
        colorIndex: 2,
        members: membersB,
      },
      kinds: drawRoundGames(poolFor("development"), config.k, "mock-round"),
    });
    this.view = this.buildView();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  getView(): MatchView {
    return this.view;
  }

  // The fake client drives its own reducer with Date.now(), so it is the
  // server — there is no clock to correct against.
  serverOffsetMs(): number {
    return 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  ready(ordinal: number): void {
    if (this.view.viewerId === null) return;
    this.dispatch({
      type: "playerReady",
      ordinal,
      playerId: this.view.viewerId,
    });
  }

  act(ordinal: number, action: unknown): void {
    if (this.view.viewerId === null) return;
    this.dispatch({
      type: "gameAction",
      ordinal,
      playerId: this.view.viewerId,
      action,
    });
  }

  forceStart(ordinal: number): void {
    this.dispatch({ type: "hostForceStart", ordinal });
  }

  debugJoinBot(side: "A" | "B"): void {
    const bot = this.newBot();
    const teamA = [...this.state.teamA.members];
    const teamB = [...this.state.teamB.members];
    (side === "A" ? teamA : teamB).push(bot);
    this.dispatch({ type: "rosterChanged", teamA, teamB });
  }

  debugKick(playerId: string): void {
    this.dispatch({
      type: "rosterChanged",
      teamA: this.state.teamA.members.filter((id) => id !== playerId),
      teamB: this.state.teamB.members.filter((id) => id !== playerId),
    });
  }

  destroy(): void {
    clearInterval(this.timer);
    this.listeners.clear();
  }

  private newBot(): string {
    const id = `bot-${this.botCounter}`;
    this.labels[id] = `Bot ${BOT_NAMES[this.botCounter % BOT_NAMES.length]}`;
    this.botCounter += 1;
    return id;
  }

  private bots(): string[] {
    return [...this.state.teamA.members, ...this.state.teamB.members].filter(
      (id) => id !== this.view.viewerId,
    );
  }

  private dispatch(event: MatchEvent): void {
    const next = applyMatchEvent(this.state, event, {
      now: Date.now(),
      games: MINIGAMES,
    });
    if (next === this.state) return;
    this.state = next;
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }

  private buildView(): MatchView {
    return {
      match: this.state,
      viewerId: this.config.role === "player" ? "you" : null,
      role: this.config.role,
      playerLabels: { ...this.labels },
    };
  }

  private tick(): void {
    const now = Date.now();
    const phase = derivePhase(this.state);
    if (phase.kind === "complete") return;
    const slot = phase.slot;

    if (slot.phase === "gate") {
      if (this.gateOrdinal !== slot.ordinal) {
        this.gateOrdinal = slot.ordinal;
        this.gateEnteredAt = now;
      }
      this.bots().forEach((id, i) => {
        const due =
          this.gateEnteredAt +
          this.config.botReadyDelayMs +
          i * BOT_READY_STAGGER_MS;
        if (now >= due && !slot.ready.includes(id)) {
          this.dispatch({
            type: "playerReady",
            ordinal: slot.ordinal,
            playerId: id,
          });
        }
      });
      return;
    }
    if (slot.phase === "countdown") {
      if (slot.countdownEndsAt !== null && now >= slot.countdownEndsAt) {
        this.dispatch({ type: "countdownElapsed", ordinal: slot.ordinal });
      }
      return;
    }
    if (slot.phase === "playing") {
      if (slot.deadline !== null && now >= slot.deadline) {
        this.dispatch({ type: "finalize", ordinal: slot.ordinal });
        return;
      }
      for (const id of this.bots()) {
        const last = this.lastMash.get(id) ?? 0;
        if (now - last >= this.config.botMashIntervalMs) {
          this.lastMash.set(id, now);
          this.dispatch({
            type: "gameAction",
            ordinal: slot.ordinal,
            playerId: id,
            action: { type: "mash" },
          });
        }
      }
      return;
    }
    if (slot.phase === "scoring") {
      if (slot.scoringEndsAt !== null && now >= slot.scoringEndsAt) {
        this.dispatch({ type: "scoringElapsed", ordinal: slot.ordinal });
      }
    }
  }
}
