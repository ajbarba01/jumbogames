/**
 * One quiet docked line carrying a status or predictive notice — status hue, a
 * decorative dot, the message, and an optional inline action. UI.md's banners
 * law in member form: it never takes the frame and never persists past
 * relevance.
 */
import { cx } from "../cx";

export type StatusTone = "info" | "warn" | "ok" | "crit" | "run";

export interface StatusLineProps {
  /** Quiet by default; pick a hue only when the state has one. */
  tone?: StatusTone;
  children: React.ReactNode;
  /** Trailing control, e.g. a text Button. */
  action?: React.ReactNode;
  /** Announce changes to assistive tech. */
  live?: boolean;
  className?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  info: "text-s7",
  warn: "text-warn",
  ok: "text-ok",
  crit: "text-crit",
  run: "text-run",
};

export function StatusLine({
  tone = "info",
  children,
  action,
  live = false,
  className,
}: StatusLineProps): React.JSX.Element {
  return (
    <p
      role={live ? "status" : undefined}
      className={cx(
        "flex min-w-0 flex-wrap items-center gap-2 text-meta font-bold",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden>●</span>
      <span className="min-w-0">{children}</span>
      {action}
    </p>
  );
}
