/**
 * The trace readout: the word currently being traced, styled by whether it
 * would be accepted, and whichever bounce — local or server — is the
 * freshest reason nothing captured. A server bounce naming the word that
 * blocked the attempt matters more than usual: under acknowledgement-only
 * optimism, a bounce is the one moment the round trip is visible at all, so
 * it has to teach rather than just fail.
 *
 * Every state renders inside one fixed-height row. The traced word is set
 * several steps larger than the bounce and idle lines, so letting each state
 * size its own box made the line grow and shrink under a flex-sized board —
 * which moved the whole board, mid-drag, on the exact keystroke-equivalent
 * the player is watching.
 */
"use client";
import { cx } from "@jumbo/ui";
import { MIN_WORD_LENGTH } from "@jumbo/engine";
import type { RejectReason, WordLockReject } from "@jumbo/engine";

function localReasonText(word: string): string {
  return word.length < MIN_WORD_LENGTH ? "Too short" : "Not a word";
}

function serverReasonText(reason: RejectReason): string {
  switch (reason) {
    case "too-short":
      return "Too short";
    case "too-long":
      return "Too long";
    case "bad-path":
      return "Not a valid path";
    case "not-a-word":
      return "Not a word";
    case "already-played":
      return "Already played";
    case "blocked":
      return "Blocked by a longer word";
  }
}

export function TraceLabel({
  word,
  valid,
  localReject,
  serverReject,
}: {
  word: string;
  valid: boolean;
  localReject: string | null;
  serverReject: WordLockReject | null;
}): React.JSX.Element {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center">
      {content({ word, valid, localReject, serverReject })}
    </div>
  );
}

/** The row's one line, whichever state it is in. Split out so the fixed-height
 *  row above has exactly one place it can be entered from. */
function content({
  word,
  valid,
  localReject,
  serverReject,
}: {
  word: string;
  valid: boolean;
  localReject: string | null;
  serverReject: WordLockReject | null;
}): React.JSX.Element {
  if (word.length > 0) {
    return (
      <p
        className={cx(
          "text-center font-display text-2xl leading-none",
          valid ? "text-ok" : "text-s11",
        )}
      >
        {word}
      </p>
    );
  }

  if (localReject !== null) {
    return (
      <p
        aria-live="polite"
        className="text-center text-sec leading-none font-bold text-crit"
      >
        {localReject} — {localReasonText(localReject)}
      </p>
    );
  }

  if (serverReject !== null) {
    return (
      <p
        aria-live="polite"
        className="text-center text-sec leading-none font-bold text-crit"
      >
        {serverReasonText(serverReject.reason)}
      </p>
    );
  }

  return (
    <p className="text-center text-sec leading-none text-s9">Trace a word</p>
  );
}
