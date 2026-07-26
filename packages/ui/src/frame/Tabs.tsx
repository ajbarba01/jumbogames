/**
 * Segmented tab bar: sticker-faced buttons that switch between peer views of
 * one surface. The selected face takes the pressed treatment plus a tint; a
 * disabled tab stays present and announced rather than vanishing, because a
 * view that is not available yet is information, not absence.
 */
"use client";

import { useRef } from "react";
import { cx } from "../cx";

export interface TabSpec {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: readonly TabSpec[];
  active: string;
  onSelect: (id: string) => void;
  /** Names the tablist for assistive tech. */
  label: string;
  className?: string;
}

export function Tabs({
  tabs,
  active,
  onSelect,
  label,
  className,
}: TabsProps): React.JSX.Element {
  // Tabs is controlled: selecting a tab does not by itself move DOM focus, and
  // a tabIndex change alone never blurs the previously focused button. So
  // arrow navigation tracks each button by id and focuses the newly selected
  // one directly, keeping focus and selection in lockstep for keyboard users.
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  // Arrow keys move selection to the next enabled tab and wrap. A disabled tab
  // is skipped rather than landed on, so the keyboard never parks somewhere it
  // cannot act.
  function move(from: number, step: number): void {
    for (let i = 1; i <= tabs.length; i += 1) {
      const next = tabs[(from + step * i + tabs.length * i) % tabs.length];
      if (next && next.disabled !== true) {
        onSelect(next.id);
        buttonRefs.current.get(next.id)?.focus();
        return;
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx("flex gap-3", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        const disabled = tab.disabled === true;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(tab.id, el);
              } else {
                buttonRefs.current.delete(tab.id);
              }
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!disabled) onSelect(tab.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cx(
              "slip sticker rounded-r2 px-6 py-2 text-sec font-bold",
              disabled
                ? "cursor-default bg-s2 text-s6 opacity-60"
                : selected
                  ? "sticker-pressed cursor-pointer bg-s4 text-s12"
                  : "sticker-hover sticker-press cursor-pointer bg-s2 text-s9",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
