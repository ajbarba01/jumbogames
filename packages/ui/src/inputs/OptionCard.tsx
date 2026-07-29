/**
 * Selectable sticker card: a toggle whose whole face is the affordance, for
 * picking several items out of a small visible set. Carries the register's
 * selection marker — a tint plus a trailing check — which previously existed
 * only inside MenuItem.
 *
 * The optional leading icon is for a set whose members have marks of their own,
 * so the card can be recognised without being read. It is centred against the
 * card's full height rather than aligned to the title: a mark is the card's
 * second identity, not a bullet on its first line.
 */
"use client";

import { cx } from "../cx";

export interface OptionCardProps {
  /** Primary line; also the accessible name. */
  title: string;
  /** Secondary line explaining the option. */
  description?: string;
  /** Decorative mark identifying the option; sized by the card, not the caller. */
  icon?: React.ReactNode;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onToggle,
  disabled = false,
  className,
}: OptionCardProps): React.JSX.Element {
  return (
    // min-w-0 on the text column is what keeps a long title wrapping inside
    // the card instead of widening it past the 207px floor (docs/UI.md); the
    // icon and the check are inherently fixed and stay under that budget.
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cx(
        "slip sticker sticker-hover sticker-press flex w-full min-w-0 cursor-pointer items-center justify-between gap-2.5 rounded-r2 p-3 text-left",
        selected ? "bg-s4" : "bg-s2",
        disabled && "cursor-default opacity-60",
        className,
      )}
    >
      {/* The card owns the icon's size so a caller cannot hand in a mark that
          breaks the row; the mark only has to draw itself in its own box. */}
      {icon && (
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 text-s12 [&>svg]:h-full [&>svg]:w-full"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sec font-bold text-s12">{title}</span>
        {description && (
          <span className="text-meta text-s9">{description}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cx(
          "ml-auto shrink-0 font-bold text-s12",
          selected ? "visible" : "invisible",
        )}
      >
        ✓
      </span>
    </button>
  );
}
