/**
 * The kit's action control: six variants (primary/quiet/outline/block/ghost/
 * text), an icon-geometry mode, and a disabled face that carries no hover or
 * press affordance.
 */
import { cx } from "../cx";

export type ButtonVariant =
  "primary" | "quiet" | "outline" | "block" | "ghost" | "text";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the accent action (one per view at most) · quiet: the solid workhorse ·
   *  outline: secondary/deny · block: raised square utility · ghost: chrome-adjacent icon ·
   *  text: ink-only toolbar control. */
  variant?: ButtonVariant;
  /** Square icon geometry instead of text padding. */
  icon?: boolean;
}

/** Look per variant. `on` carries hover + press — the raised variants wear the
 *  sticker chrome (lift on hover, drop-onto-shadow on press, via the tokens.css
 *  presets); ghost/text stay chrome-adjacent. `off` is the disabled face — no
 *  hover, no press, no pointer (the graduation checklist's rule). */
const FACE: Record<ButtonVariant, { on: string; off: string }> = {
  primary: {
    on: "slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 bg-accent font-bold text-edge",
    off: "cursor-default rounded-r2 border-2 border-s4 font-bold text-s6",
  },
  quiet: {
    on: "slip sticker sticker-hover sticker-press cursor-pointer rounded-r1 bg-s4 font-bold text-s12 hover:bg-s5",
    off: "cursor-default rounded-r1 border-2 border-s4 bg-s3 font-bold text-s6",
  },
  // Ghost/text/outline are GROUND-ADAPTIVE: they inherit the surface's ink
  // (dark modals paper, cream ink on boards) instead of hardcoding a step,
  // so one face works on both grounds.
  outline: {
    on: "slip sticker sticker-hover sticker-press cursor-pointer rounded-r1 border-current font-bold",
    off: "cursor-default rounded-r1 border-2 border-current font-bold opacity-40",
  },
  block: {
    on: "slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 bg-s3 font-bold text-s11 hover:bg-s4 hover:text-s12",
    off: "cursor-default rounded-r2 border-2 border-s4 bg-s3 font-bold text-s6",
  },
  ghost: {
    on: "slip cursor-pointer rounded-r2 font-bold opacity-75 hover:bg-accent hover:text-edge hover:opacity-100",
    off: "cursor-default rounded-r2 font-bold opacity-40",
  },
  text: {
    on: "slip cursor-pointer font-bold underline-offset-4 opacity-75 hover:underline hover:opacity-100",
    off: "cursor-default font-bold opacity-40",
  },
};

const GEOM: Record<ButtonVariant, { text: string; icon: string }> = {
  primary: {
    text: "px-4 py-1.5 text-sec",
    icon: "flex h-7 w-7 items-center justify-center text-body",
  },
  quiet: {
    text: "px-3 py-1 text-code",
    icon: "flex h-7 w-7 items-center justify-center text-code",
  },
  outline: {
    text: "px-3 py-1 text-code",
    icon: "flex h-7 w-7 items-center justify-center text-code",
  },
  block: {
    text: "px-3 py-1 text-code",
    icon: "flex h-7 w-7 items-center justify-center",
  },
  ghost: {
    text: "px-2 py-1 text-sec",
    icon: "flex h-8 w-8 items-center justify-center text-icon",
  },
  text: { text: "text-meta", icon: "text-meta" },
};

export function Button({
  variant = "quiet",
  icon = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  // Press travel lives in the .sticker-press preset (theme-owned distance).
  const face = disabled ? FACE[variant].off : FACE[variant].on;
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        face,
        icon ? GEOM[variant].icon : GEOM[variant].text,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
