/**
 * In-memory MatchClient driving the pure lifecycle reducer with timers and
 * scripted bot opponents — the /mockup event source. Swapping this class for
 * the Realtime-backed client is the entire backend integration seam.
 */
import { MINIGAMES } from "@jumbo/engine";
import type { MinigameKind } from "@jumbo/engine";
import type { MatchClient, MatchView, ViewerRole } from "./client";
import { derivePhase } from "@jumbo/engine";
import { applyMatchEvent, createMatch } from "@jumbo/engine";
import { drawRoundGames, nextTickAt } from "@jumbo/engine";
import { findWords, seededShuffle, tileOwnerIndex } from "@jumbo/engine";
import type { FoundWord } from "@jumbo/engine";
import type {
  MatchEvent,
  MatchState,
  SlotState,
  WordLockAction,
  WordLockState,
} from "@jumbo/engine";

const TICK_MS = 150;
// The mock plays only dev-only games; real games need server content it has
// no way to fetch. This used to lean on poolFor("test"), which no longer says
// that — the test pool now admits every kind so E2E can draw trivia — so the
// mock states its own requirement directly.
const MOCK_POOL = (Object.keys(MINIGAMES) as MinigameKind[]).filter(
  (kind) => MINIGAMES[kind].devOnly,
);
const BOT_READY_STAGGER_MS = 400;
// findWords walks tiles in strict index order and stops the entire search
// the moment a `limit` is hit, so any limit short of "the whole board" does
// not sample the board — it returns only the neighbourhood of tile 0 (and,
// measured directly: even a limit of 2000 only reached tile-scan row 12 of
// 24 on a full-size board). The cap exists to keep the prefix-pruned solver
// off the tab's main thread on every tick, not to bound how much of the
// board a bot can see, and this runs once per cached epoch rather than per
// bot per tick (see `wordlockCache`), so the cost is paid rarely — measured
// at ~115ms uncapped against the real word list on a 24x24 board, well under
// one tick. No `limit` is passed at all: the whole board's candidates are
// found and cached once, then shuffled for bots to draw from. Capping bot
// vocabulary short of the game's own MAX_WORD_LENGTH (12, tuning.ts) means
// every bot hits the same wall at once: once all short candidates in a
// region are played or blocked, nothing can find the longer word needed to
// break in and re-contest it, dispatches stop, and — because
// `advanceRefresh` only runs inside `apply`, which only runs on a dispatched
// action — the refresh ripple stops being driven too. 8 stays well inside
// the game's real range while keeping cost far below an unbounded search
// (measured 218ms uncapped at length 8 on a 24x24 board, same order of
// magnitude as length 5's 254ms, both paid once per epoch/letters change).
const WORDLOCK_BOT_MAX_LENGTH = 8;
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
  /**
   * Draw from these kinds instead of the dev-only default. Most content games
   * pinned this way show only their reveal, slot card and gate — their play
   * surface stays empty because the mock has no question bank to fetch. Word
   * Lock is the exception: it needs no external content, so once its word
   * list is installed client-side it plays for real against the bots below.
   */
  pool?: MinigameKind[];
}

export class FakeMatchClient implements MatchClient {
  private state: MatchState;
  private view: MatchView;
  private readonly listeners = new Set<() => void>();
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly labels: Record<string, string> = {};
  private readonly lastMash = new Map<string, number>();
  // Keyed on ordinal + epoch + letters so a new slot or a refresh invalidates
  // it, but repeated ticks against an unchanged board reuse the same sweep.
  private wordlockCache: { key: string; found: FoundWord[] } | null = null;
  private gateOrdinal: number | null = null;
  private gateEnteredAt = 0;
  // nextTickAt always returns an instant strictly after the `now` it was
  // given, so it can never be compared against that same `now` — it has to
  // be cached from a previous tick and checked against the *next* one.
  private tickOrdinal: number | null = null;
  private nextGameTickAt: number | null = null;
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
      kinds: drawRoundGames(
        config.pool?.length ? config.pool : MOCK_POOL,
        config.k,
        "mock-round",
      ),
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

  // `mash` is the default action for every stub-style minigame; Word Lock is
  // the one kind whose bots need an actual move, computed by the solver.
  private botAction(slot: SlotState, botId: string): unknown | null {
    if (slot.kind !== "wordlock") return { type: "mash" };
    const path = this.findWordLockMove(
      slot.ordinal,
      slot.payload as WordLockState,
      botId,
    );
    if (path === null) return null;
    const action: WordLockAction = { type: "submit", path };
    return action;
  }

  private findWordLockMove(
    ordinal: number,
    payload: WordLockState,
    botId: string,
  ): number[] | null {
    const key = `${ordinal}:${payload.epoch}:${payload.letters}`;
    if (this.wordlockCache?.key !== key) {
      const found = findWords(payload.letters, payload.side, {
        maxLength: WORDLOCK_BOT_MAX_LENGTH,
      });
      // findWords returns candidates in tile-scan order, which clusters them
      // near low tile indices; shuffling spreads bot picks across the whole
      // board instead of every bot queuing on the same early words. Seeded on
      // the same key that invalidates the cache, so a mockup session stays
      // reproducible rather than reshuffling on every access.
      this.wordlockCache = { key, found: seededShuffle(found, key) };
    }

    const owners = tileOwnerIndex(payload.words, payload.letters.length);
    const played = new Set(payload.played[botId] ?? []);
    for (const { word, path } of this.wordlockCache.found) {
      if (played.has(word)) continue;
      const blocked = path.some((tile) => {
        const owner = owners[tile]!;
        return owner !== -1 && payload.words[owner]!.path.length >= path.length;
      });
      if (blocked) continue;
      return path;
    }
    return null;
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

  // Real transport (both the match GET route and the realtime broadcast)
  // redacts each slot's payload per viewer before it ever leaves the server;
  // a play surface like Word Lock's reads that redacted shape (its `scores`
  // field does not exist on the raw server state at all) and crashes without
  // it. The fake client is the server here, so it owns the same step.
  private buildView(): MatchView {
    const viewerId = this.config.role === "player" ? "you" : null;
    return {
      match: {
        ...this.state,
        slots: this.state.slots.map((slot) => {
          const game = MINIGAMES[slot.kind];
          if (!game.redact || slot.payload === null) return slot;
          return { ...slot, payload: game.redact(slot.payload, viewerId) };
        }),
      },
      viewerId,
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
      // Mirrors the room's alarm: a game that wants a clock-driven advance
      // (Word Lock's dead-tile refresh) gets one even if no one dispatches a
      // gameAction, so a saturated board doesn't freeze in the mockup the way
      // it used to before the fix this harness is meant to demonstrate.
      if (this.tickOrdinal !== slot.ordinal) {
        this.tickOrdinal = slot.ordinal;
        this.nextGameTickAt = nextTickAt(this.state, MINIGAMES, now);
      }
      if (this.nextGameTickAt !== null && now >= this.nextGameTickAt) {
        this.dispatch({ type: "gameTick", ordinal: slot.ordinal });
        this.nextGameTickAt = nextTickAt(this.state, MINIGAMES, now);
      }
      for (const id of this.bots()) {
        const last = this.lastMash.get(id) ?? 0;
        if (now - last < this.config.botMashIntervalMs) continue;
        this.lastMash.set(id, now);
        // Re-derive the slot on every bot rather than reusing the one
        // captured at the top of this tick: `dispatch` mutates `this.state`
        // synchronously, so with a stale `slot` every bot in this loop would
        // decide against the same pre-tick board. For Word Lock that meant
        // every bot proposed the same first-available word each tick, and
        // only whichever bot iterates first (always team A, by `this.bots()`
        // order) could land it — every later bot's identical submission was
        // rejected as already blocked, so team B never scored regardless of
        // headcount. Reading fresh state per bot lets each one see the
        // capture the bot before it just made.
        const current = derivePhase(this.state);
        if (current.kind !== "slot" || current.slot.phase !== "playing") break;
        const action = this.botAction(current.slot, id);
        if (action === null) continue;
        this.dispatch({
          type: "gameAction",
          ordinal: current.slot.ordinal,
          playerId: id,
          action,
        });
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
