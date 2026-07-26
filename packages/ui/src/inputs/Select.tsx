/** Single-value picker in two faces: the compact accent chip (default) and a
 *  form-register field that fills the caller's width; both open the same
 *  positioned option popup, and either can be disabled. */
"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { useState } from "react";
import { cx } from "../cx";
import { menuSurface } from "../overlay/MenuCard";
import { useDismissLayer } from "../overlay/layers";

export interface SelectProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** chip: the compact accent sticker that sizes to its value (default).
   *  field: a form-row control that fills the width the caller gives it and
   *  stands the same height as a TextField beside it. */
  size?: "chip" | "field";
  /** Disabled face: no hover, no press, no pointer, and it will not open. */
  disabled?: boolean;
  /** Width and flex behaviour belong to the caller — the field variant has no
   *  width of its own, so it holds at the 207px floor (docs/UI.md fluid law). */
  className?: string;
  "aria-label"?: string;
}

// The chip is the quiet menu trigger; the field is a board sticker sized to sit
// in a form row. Neither wears the paper face — an entry field is paper, a
// menu trigger is a control (UI.md, one outline vocabulary).
const TRIGGER_FACE: Record<"chip" | "field", { on: string; off: string }> = {
  chip: {
    on: "slip sticker sticker-hover sticker-press flex-none cursor-pointer rounded-r1 bg-accent px-2 py-[3px] text-code font-bold text-edge",
    off: "slip flex-none cursor-default rounded-r1 border-2 border-s4 px-2 py-[3px] text-code font-bold text-s6",
  },
  field: {
    on: "slip sticker sticker-hover sticker-press flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-r2 bg-s2 px-4 py-1.5 text-sec font-bold text-s11",
    off: "slip flex min-w-0 cursor-default items-center justify-between gap-2 rounded-r2 border-2 border-s4 bg-s3 px-4 py-1.5 text-sec font-bold text-s6",
  },
};

/** The quiet select: a bordered mono chip that grows a positioned option popup.
 *  Base UI owns focus, typeahead, keyboard selection, and placement; the kit
 *  owns the skin and the `current` marker. */
export function Select({
  options,
  value,
  onChange,
  size = "chip",
  disabled = false,
  className,
  ...aria
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  useDismissLayer(open, () => setOpen(false));
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => {
        if (typeof v === "string") onChange(v);
      }}
      disabled={disabled}
      open={open}
      onOpenChange={(next, details) => {
        // Same escape contract as PopoverCard: the kit's layer stack is the one
        // Escape authority — swallow Base UI's own escape close and let the
        // keydown keep bubbling to the stack's window listener.
        if (!next && details.reason === "escape-key") {
          details.allowPropagation();
          return;
        }
        setOpen(next);
      }}
    >
      <BaseSelect.Trigger
        className={cx(
          TRIGGER_FACE[size][disabled ? "off" : "on"],
          open && !disabled && "sticker-pressed",
          className,
        )}
        {...aria}
      >
        {size === "field" ? (
          <>
            <span className="truncate">
              <BaseSelect.Value />
            </span>
            <span aria-hidden className="shrink-0">
              ▾
            </span>
          </>
        ) : (
          <>
            <BaseSelect.Value /> ▾
          </>
        )}
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-(--z-dropdown)"
        >
          <BaseSelect.Popup className={cx("slip-enter", menuSurface)}>
            {options.map((o) => (
              <BaseSelect.Item
                key={o}
                value={o}
                className={cx(
                  // The mockup's menu rows, same vocabulary as MenuItem: bold
                  // ink on cream, thick edge dividers, accent-sweep highlight,
                  // darker-cream selection with a trailing check.
                  "slip flex w-full cursor-pointer items-center gap-4 border-b-2 border-edge px-3 py-1.5 text-left text-code font-semibold whitespace-nowrap last:border-b-0",
                  o === value
                    ? "bg-s11 text-edge"
                    : "text-s2 data-[highlighted]:bg-accent data-[highlighted]:text-edge",
                )}
              >
                <BaseSelect.ItemText>{o}</BaseSelect.ItemText>
                {o === value && (
                  <span aria-hidden className="ml-auto text-code text-s2">
                    ✓
                  </span>
                )}
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
