/**
 * The minigame contract. A game's server half is pure — init/apply/finish/
 * scores over an opaque state — so reducers and route handlers can drive any
 * game identically. Content games use the optional hooks: init context fed in
 * from the IO edge, a game-decided outcome that beats the mean comparison,
 * per-viewer redaction for hidden info, client-side prediction for games
 * where a viewer's own redacted state is enough to predict their action's
 * result, and a clock-driven `tick` (paired with `nextTickAt`, its own
 * schedule) for a game whose time-driven state is stored rather than derived
 * on read. Client surfaces register separately (no React here).
 */

export type MinigameKind = "stub" | "trivia" | "wordlock";

export interface RosterSnapshot {
  teamA: string[];
  teamB: string[];
}

/**
 * The clock-driven half of the contract, as a union rather than two optional
 * methods: a game either ticks and can say when, or does neither. Declaring
 * `tick` alone type-checked while the room, which arms its alarm from
 * `nextTickAt`, would never call it — silently reproducing the liveness bug
 * where a board nobody can act on freezes for the rest of the match. The two
 * are one capability, so the type makes them arrive together.
 */
type TickCapability<S> =
  | { tick?: undefined; nextTickAt?: undefined }
  | {
      /**
       * Advance state that moves with the clock rather than with input.
       * Present only for a game whose time-driven state is *stored* — a game
       * that derives its time-dependent values on read needs neither half of
       * this pair, so the room arms no alarm for it. Must return the same
       * object identity when nothing changed, so the reducer can treat it as
       * a no-op.
       */
      tick(state: S, now: number): S;
      /**
       * When this game's `tick` next has something to do, or null if it has
       * nothing to schedule right now. Lets the room arm its alarm without
       * the selector that calls this needing to know the game's internals
       * (Word Lock's refresh epoch, say).
       */
      nextTickAt(state: S, now: number): number | null;
    };

export type MinigameServer<S = unknown, A = unknown> = MinigameServerBase<
  S,
  A
> &
  TickCapability<S>;

interface MinigameServerBase<S = unknown, A = unknown> {
  kind: MinigameKind;
  title: string;
  /**
   * One short line, for surfaces that have room for a hint and not a rule —
   * the create-form chip today. Separate from `instructions` because a chip
   * that carries a paragraph stops being scannable, which is the only reason
   * a chip exists.
   */
  tagline: string;
  /** The rules, for the gate screen, where the demo carries the mechanics. */
  instructions: string;
  playSeconds: number;
  devOnly: boolean;
  /**
   * Builds a slot's opening state. `now` is the same server-stamped clock
   * `apply` receives, so a game whose state evolves with time can record its
   * own origin rather than inferring one from its first action.
   */
  init(
    snapshot: RosterSnapshot,
    seed: string,
    now: number,
    context?: unknown,
  ): S;
  apply(state: S, playerId: string, action: A, now: number): S;
  isFinished(state: S, now: number): boolean;
  scores(state: S): Record<string, number>;
  // A game-decided winner (e.g. a tug-of-war pin, or rope position at the
  // buzzer) that beats the normalized-mean comparison at finalize; null defers
  // to the means. Takes the server-stamped clock because a game whose state
  // evolves with time — not only with actions — cannot decide from a payload
  // that is only current as of the last action.
  outcome?(state: S, now: number): "A" | "B" | null;
  // Per-viewer payload redaction applied before a view leaves the server.
  // Games with hidden info strip it here; absent means payload is public.
  redact?(state: S, viewerId: string | null): unknown;
  // Client-side prediction (optimistic UI tier 2). Present only when a viewer's
  // REDACTED state is sufficient to compute the result of their own action —
  // so a hidden-information game must leave this absent and gets
  // acknowledgement-only optimism instead (DESIGN.md decision 23). Runs on the
  // client against the last authoritative view; the server's frame always wins.
  predict?(state: S, playerId: string, action: A, now: number): S;
}
