/**
 * A team's identity: its palette swatch beside its name. The pairing is
 * load-bearing rather than decorative — 15 colours cannot all be
 * colourblind-safe, so the name always travels with the swatch (docs/UI.md's
 * team-palette law). Identity, never state: this face must never be read as
 * a status hue.
 */
import { cx } from "../cx";

export type TeamChipSize = "xs" | "sm" | "md" | "lg";

export interface TeamChipProps {
  /** 1-based index into the fixed team palette (`--color-team-1…15`). */
  colorIndex: number;
  name: string;
  /** xs: log rows · sm: rosters · md: default, projector headers · lg: the verdict stamp. */
  size?: TeamChipSize;
  /** Mirror the row so the swatch sits outboard on a right-aligned end. */
  reverse?: boolean;
  className?: string;
}

const SIZE: Record<
  TeamChipSize,
  { row: string; swatch: string; text: string }
> = {
  xs: { row: "gap-2", swatch: "h-2.5 w-2.5", text: "text-meta" },
  sm: { row: "gap-2", swatch: "h-3 w-3", text: "text-sec font-bold" },
  md: { row: "gap-2.5", swatch: "h-4 w-4", text: "font-display text-2xl" },
  lg: { row: "gap-3", swatch: "h-5 w-5", text: "font-display text-4xl" },
};

export function TeamChip({
  colorIndex,
  name,
  size = "md",
  reverse = false,
  className,
}: TeamChipProps): React.JSX.Element {
  const step = SIZE[size];
  return (
    <span
      className={cx(
        "flex min-w-0 items-center",
        step.row,
        reverse && "flex-row-reverse",
        className,
      )}
    >
      {/* The swatch must keep its size and the name is what can lose width
          without losing meaning, so the name is the one that truncates. */}
      <span
        className={cx("flex-none rounded-r1", step.swatch)}
        style={{ background: `var(--color-team-${colorIndex})` }}
        aria-hidden
      />
      <span className={cx("min-w-0 truncate", step.text)}>{name}</span>
    </span>
  );
}
