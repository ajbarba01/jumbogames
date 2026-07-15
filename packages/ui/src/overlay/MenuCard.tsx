/** Shared floating-surface skin and row primitives — MenuCard, MenuItem, CapsLabel — for popups and menus. */
import { cx } from "../cx";

/** The floating option surface — one skin for every popup (bespoke cards, Base UI
 *  popovers, the select): a PAPER sticker — cream ground, edge border, hard
 *  float shadow — whose rows divide with thick edge lines (the mockup's menu). */
export const menuSurface =
  "overflow-hidden sticker rounded-r3 bg-s12 shadow-float";

export function MenuCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cx("slip-enter", menuSurface, className)} {...rest}>
      {children}
    </div>
  );
}

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected = s4 tint + the trailing mono `current` marker (one vocabulary everywhere). */
  selected?: boolean;
}

export function MenuItem({
  selected = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...rest
}: MenuItemProps): React.JSX.Element {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        // The mockup's menu rows: bold ink on cream, divided by thick edge
        // lines; hover is the accent sweep, selection the darker cream tint
        // plus a trailing check (icons, never words).
        "slip flex w-full items-center gap-2.5 border-b-2 border-edge px-3 py-1.5 text-left text-sec font-semibold last:border-b-0",
        disabled
          ? "cursor-default text-s9"
          : selected
            ? "cursor-pointer bg-s11 text-edge"
            : "cursor-pointer text-s2 hover:bg-accent hover:text-edge",
        className,
      )}
      {...rest}
    >
      {children}
      {selected && (
        <span aria-hidden className="ml-auto pl-4 text-sec text-s2">
          ✓
        </span>
      )}
    </button>
  );
}

/** The tracked-caps section header (menus, sidebars, dialogs). s7 is the one
 *  step that stays legible on both paper (menus) and dark chrome (sidebars). */
export function CapsLabel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cx(
        "px-3 pt-2 pb-0.5 text-caps tracking-[0.07em] text-s7 uppercase",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
