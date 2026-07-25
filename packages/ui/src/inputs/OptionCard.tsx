/**
 * Selectable sticker card: a toggle whose whole face is the affordance, for
 * picking several items out of a small visible set. Carries the register's
 * selection marker — a tint plus a trailing check — which previously existed
 * only inside MenuItem.
 */
"use client";

import { cx } from "../cx";

export interface OptionCardProps {
  /** Primary line; also the accessible name. */
  title: string;
  /** Secondary line explaining the option. */
  description?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function OptionCard({
  title,
  description,
  selected,
  onToggle,
  disabled = false,
  className,
}: OptionCardProps): React.JSX.Element {
  return (
    // min-w-0 on the text column is what keeps a long title wrapping inside
    // the card instead of widening it past the 207px floor (docs/UI.md).
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cx(
        "slip sticker sticker-hover sticker-press flex w-full min-w-0 cursor-pointer items-start justify-between gap-2 rounded-r2 p-3 text-left",
        selected ? "bg-s4" : "bg-s2",
        disabled && "cursor-default opacity-60",
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sec font-bold text-s12">{title}</span>
        {description && (
          <span className="text-meta text-s9">{description}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cx("font-bold text-s12", selected ? "visible" : "invisible")}
      >
        ✓
      </span>
    </button>
  );
}
