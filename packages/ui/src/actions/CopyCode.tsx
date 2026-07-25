/**
 * Click-to-copy code chip: shows a short code (the game/join code) in the
 * register's accent mono and copies it to the clipboard on click, with a brief
 * confirmation. Mono is the sanctioned code treatment (per UI.md); the copy is
 * the whole affordance, so the code itself is the button.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "../cx";

export interface CopyCodeProps {
  /** The code to display and copy. */
  value: string;
  /** Accessible name; defaults to "Copy code {value}". */
  "aria-label"?: string;
  /** Passed to the value element so callers can target the code text in tests. */
  "data-testid"?: string;
  /** Visual weight: inline chip (default) or the landing-screen headline. */
  size?: "inline" | "display";
  className?: string;
}

// The display size is fluid, not a fixed step: six mono cells with 0.2em
// tracking must still fit the 207px narrowest card at the 375px floor
// (docs/UI.md, fluid law).
const SIZE_CLASS = {
  inline: "text-2xl",
  display: "text-[clamp(1.75rem,9vw,2.75rem)]",
} as const;

export function CopyCode({
  value,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
  size = "inline",
  className,
}: CopyCodeProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard unavailable — nothing to confirm
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={ariaLabel ?? `Copy code ${value}`}
      className={cx(
        "slip group inline-flex cursor-pointer items-center gap-2 rounded-r1",
        className,
      )}
    >
      <span
        data-testid={dataTestId}
        className={cx(
          "font-mono font-bold tracking-[0.2em] text-accent",
          SIZE_CLASS[size],
        )}
      >
        {value}
      </span>
      <span
        aria-hidden
        className={cx(
          "slip text-icon",
          copied ? "text-ok" : "text-s7 group-hover:text-s10",
        )}
      >
        {copied ? "✓" : "⧉"}
      </span>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
