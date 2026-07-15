/** Single-value picker: a bordered mono chip that opens a positioned option popup. */
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
  "aria-label"?: string;
}

/** The quiet select: a bordered mono chip that grows a positioned option popup.
 *  Base UI owns focus, typeahead, keyboard selection, and placement; the kit
 *  owns the skin and the `current` marker. */
export function Select({
  options,
  value,
  onChange,
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
        // The mockup's menu trigger: a small accent sticker, bold sans.
        className={cx(
          "slip sticker sticker-hover sticker-press flex-none cursor-pointer rounded-r1 bg-accent px-2 py-[3px] text-code font-bold text-edge",
          open && "sticker-pressed",
        )}
        {...aria}
      >
        <BaseSelect.Value /> ▾
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
