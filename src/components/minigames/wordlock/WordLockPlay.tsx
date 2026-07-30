/**
 * Word Lock's play surface: the match clock, the shared board, the trace in
 * progress, and the one bar that says who holds more ground per player.
 * Nothing here decides a capture — the server does, and its frame always
 * wins — so a submission is sent optimistically only in the sense that the
 * trace clears immediately. The clock and the board's per-tile refresh bars
 * are both extrapolated from the last pushed payload against the same
 * offset-corrected clock, the way Tug O' Lore extrapolates its rope, so they
 * keep moving smoothly between server pushes instead of stepping on each one.
 */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_PERIOD_MS } from "@jumbo/engine";
import type { WordLockView } from "@jumbo/engine";
import { useNow } from "@/components/match/use-now";
import type { MinigamePlayProps } from "../registry";
import { Grid } from "./Grid";
import { ShareBar } from "./ShareBar";
import { TraceLabel } from "./TraceLabel";
import { teamShares } from "./share";
import { useHintDictionary } from "./use-hint-dictionary";
import { useTrace } from "./use-trace";

/**
 * How long a bounce — the message and the flash on the word that blocked it —
 * stays up. `lastReject` is durable server state: it is cleared only by that
 * player's next successful capture, so without a window of its own it is not
 * a bounce at all but a mode the board sits in, re-announcing itself every
 * time the traced word empties and repainting the blocking word over whatever
 * is being traced now. The clock below already re-renders this surface ten
 * times a second, so an expiry read off it needs no timer of its own.
 */
const REJECT_VISIBLE_MS = 2500;

/** `mm:ss`, matching Tug O' Lore's clock format so the two projector-facing
 *  timers in the app read the same way. */
function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function WordLockPlay({
  view,
  slot,
  canAct,
  onAction,
  offsetMs,
}: MinigamePlayProps): React.JSX.Element | null {
  const payload = slot.payload as WordLockView | null;
  const hint = useHintDictionary();
  // useHintDictionary returns a fresh object (and a fresh `has` closure)
  // every render, so keying `submit` on it directly would rebuild the
  // callback — and every hook downstream that keys on it — on every render
  // this surface takes part in. The ref lets `submit` stay referentially
  // stable across renders that don't change `canAct`/`onAction`/`payload`;
  // the ref is read at call time, so it never sees a stale hint.
  const hintRef = useRef(hint);
  useEffect(() => {
    hintRef.current = hint;
  }, [hint]);
  // Stamped, not bare: a local bounce expires on the same clock as a server
  // one so the two read as the same kind of momentary event.
  const [localReject, setLocalReject] = useState<{
    word: string;
    at: number;
  } | null>(null);

  const submit = useCallback(
    (path: number[]) => {
      if (!canAct || payload === null) return;
      const word = path.map((tile) => payload.letters[tile] ?? "").join("");
      const currentHint = hintRef.current;
      // The hint spares the server a full fan-out per doomed submission: a
      // rejection has to mutate state to be broadcast at all. Before the list
      // lands, send anyway — the server is the authority either way.
      if (currentHint.ready && !currentHint.has(word)) {
        setLocalReject({ word, at: Date.now() });
        return;
      }
      setLocalReject(null);
      onAction({ type: "submit", path });
    },
    [canAct, onAction, payload],
  );

  const trace = useTrace({
    side: payload?.side ?? 0,
    letters: payload?.letters ?? "",
    onSubmit: submit,
  });

  // Called unconditionally, ahead of the payload-null early return below, per
  // the rules of hooks — a spectator with no payload still ticks a clock that
  // is simply never rendered.
  const now = useNow();

  if (payload === null) return null;
  const shares = teamShares(payload, view.viewerId);
  const valid = trace.word.length >= 3 && hint.has(trace.word);

  const mineSide: "A" | "B" | null =
    view.viewerId === null
      ? null
      : payload.teamA.includes(view.viewerId)
        ? "A"
        : payload.teamB.includes(view.viewerId)
          ? "B"
          : null;

  // Matches TriviaPlay's derivation exactly: the deadline minus the
  // server-corrected clock, ceiled to whole seconds and floored at zero so a
  // slow client never counts past the server's own end of play.
  const serverNow = now + offsetMs;
  const remaining = Math.max(
    0,
    Math.ceil(((slot.deadline ?? serverNow) - serverNow) / 1000),
  );

  // A bounce is shown only while it is fresh (see `REJECT_VISIBLE_MS`). The
  // server's stamp is on the server's clock and the local one is on this
  // client's, so each is aged against the clock it was written with.
  const freshReject =
    payload.lastReject !== null &&
    serverNow - payload.lastReject.at < REJECT_VISIBLE_MS
      ? payload.lastReject
      : null;
  const freshLocalReject =
    localReject !== null && now - localReject.at < REJECT_VISIBLE_MS
      ? localReject.word
      : null;

  // Every qualifying tile rerolls on the same boundary, so one progress value
  // (0 at a boundary, 1 just before the next) drives every bar on the board.
  // Clamped at zero the way `refreshEpochAt` clamps its own elapsed time, so
  // a client clock briefly behind `startedAt` never wraps negative.
  const elapsedSinceStart = Math.max(0, serverNow - payload.startedAt);
  const refreshProgress =
    (elapsedSinceStart % REFRESH_PERIOD_MS) / REFRESH_PERIOD_MS;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Same step as Tug O' Lore's match clock (`TriviaPlay`), deliberately:
          the two are the same object to a player and both get projected. */}
      <p className="text-center font-display text-4xl text-s12 sm:text-5xl">
        {formatClock(remaining)}
      </p>
      <ShareBar
        shares={shares}
        teamA={view.match.teamA}
        teamB={view.match.teamB}
        mineSide={mineSide}
      />
      <Grid
        view={payload}
        teamA={view.match.teamA}
        teamB={view.match.teamB}
        path={trace.path}
        traceValid={valid}
        flashTiles={freshReject}
        refreshProgress={refreshProgress}
        onTileDown={trace.onTileDown}
        onTileEnter={trace.onTileEnter}
        onRelease={trace.onRelease}
      />
      <TraceLabel
        word={trace.word}
        valid={valid}
        localReject={freshLocalReject}
        serverReject={freshReject}
      />
    </div>
  );
}
