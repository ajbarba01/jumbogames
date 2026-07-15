/**
 * Segmented fixed-length code entry — one paper cell per character, mono voice
 * (the register reserves mono for literal code and code entry, per UI.md).
 * Typing fills a cell and advances; backspace steps back; paste distributes;
 * focus jumps to the first empty cell so entry stays gapless. Controlled:
 * `value` is the joined, uppercased string; charset is alphanumeric. Each cell
 * is its own input, so the caret and text selection are the browser's own.
 */
"use client";

import { useRef } from "react";
import { cx } from "../cx";

export interface CodeInputProps {
  /** Accessible name for the cell group and a base for each cell's label. */
  "aria-label": string;
  /** The joined code so far, at most `length` characters. */
  value: string;
  /** Emits the new joined value on every cell edit. */
  onChange: (value: string) => void;
  /** Number of cells. */
  length?: number;
  /** Ghost text shown per cell before a character is typed (one char per cell). */
  placeholder?: string;
  /** Fired once the final empty cell is filled, with the complete value. */
  onComplete?: (value: string) => void;
  /** Invalid face: crit border on every cell. Caller owns when validity flips. */
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Optional form field name, mirrored onto a hidden aggregate input. */
  name?: string;
}

/** Keep only the characters the code alphabet allows, uppercased. */
function sanitize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function CodeInput({
  "aria-label": ariaLabel,
  value,
  onChange,
  length = 6,
  placeholder,
  onComplete,
  invalid = false,
  disabled = false,
  autoFocus = false,
  name,
}: CodeInputProps): React.JSX.Element {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // True while we move focus ourselves, so the focus handler's gap-jump logic
  // (which reads the rendered value) doesn't fight an in-flight keystroke.
  const movingFocus = useRef(false);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusCell(index: number): void {
    movingFocus.current = true;
    refs.current[index]?.focus();
    refs.current[index]?.select();
    movingFocus.current = false;
  }

  // Keep entry contiguous: a user click past the first gap jumps back to it, so
  // a hole never opens. Otherwise select the cell so a keystroke overwrites it
  // (and then advances) instead of being swallowed by maxLength.
  function handleFocus(index: number): void {
    if (movingFocus.current) return;
    const firstEmpty = chars.findIndex((char) => char === "");
    if (firstEmpty !== -1 && index > firstEmpty) {
      focusCell(firstEmpty);
      return;
    }
    refs.current[index]?.select();
  }

  // Writes one cell, emits the joined value, and reports completion. Internal
  // gaps never form: focus advances left-to-right, so join() stays contiguous.
  function commit(next: string[]): string {
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
    return joined;
  }

  function handleChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const clean = sanitize(event.target.value);
    const next = [...chars];
    if (clean === "") {
      next[index] = "";
      commit(next);
      return;
    }
    // maxLength is 1, but paste/IME can deliver more — take the last character.
    next[index] = clean[clean.length - 1];
    commit(next);
    if (index < length - 1) focusCell(index + 1);
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...chars];
      if (chars[index] !== "") {
        next[index] = "";
        commit(next);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        commit(next);
        focusCell(index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusCell(index - 1);
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusCell(index + 1);
    }
  }

  function handlePaste(
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>,
  ): void {
    event.preventDefault();
    const pasted = sanitize(event.clipboardData.getData("text"));
    if (pasted === "") return;
    const next = [...chars];
    for (let i = 0; i < pasted.length && index + i < length; i++) {
      next[index + i] = pasted[i];
    }
    commit(next);
    focusCell(Math.min(index + pasted.length, length - 1));
  }

  // Enabled cells wear the paper sticker face WITHOUT press travel (a cell must
  // not move under focus/selection); the light s12 fill is deliberate — entry
  // fields are paper on the board. Focus is the global accent ring.
  const cellFace = disabled
    ? "cursor-default border-2 border-s4 bg-s3 text-s6 placeholder:text-s5"
    : cx(
        "sticker sticker-hover bg-s12 text-edge placeholder:text-s7",
        invalid && "border-crit",
      );

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={char}
          placeholder={placeholder?.[index] ?? undefined}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={() => handleFocus(index)}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={1}
          aria-label={`${ariaLabel} character ${index + 1}`}
          className={cx(
            "slip h-14 w-12 rounded-r1 text-center font-mono text-xl font-bold uppercase",
            cellFace,
          )}
        />
      ))}
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
