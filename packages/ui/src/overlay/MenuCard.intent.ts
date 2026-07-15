/** Intent declarations for MenuCard, MenuItem, and CapsLabel — feed the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const menuCardIntent: ComponentIntent = assertIntent({
  name: "MenuCard",
  family: "Overlays",
  intent:
    "The floating option surface: one skin (ground, edge, shadow, rise) for every popup.",
  useWhen: [
    "A static or bespoke-positioned floating card (showcase specimens, custom overlays).",
    "Composing option rows or controls that need the shared popup skin without Base UI positioning.",
  ],
  dontUseWhen: [
    "A trigger-anchored popup — PopoverCard owns portal + placement.",
    "Picking one value from a flat list — Select.",
    "A blocking decision — that is a modal ground.",
  ],
  anatomy:
    "One div wearing the shared menuSurface class (paper s12 ground, sticker edge, float shadow, mount rise).",
  variantsStates: ["default (floating)", "sized by caller className"],
  accessibility:
    "Purely presentational; interactive semantics come from the rows composed inside.",
  related: ["PopoverCard", "MenuItem", "CapsLabel"],
});

export const menuItemIntent: ComponentIntent = assertIntent({
  name: "MenuItem",
  family: "Actions",
  intent:
    "The option row: bold ink on paper divided by edge lines; selection is a tint plus a trailing check, one vocabulary in every menu.",
  useWhen: [
    "Rows inside any popup card that pick, toggle, or run something.",
    "Rich rows (glyph + two-line label) via items-start and child spans.",
  ],
  dontUseWhen: [
    "Standalone actions outside a popup — Button.",
    "Navigation rows in the shell chrome — those are surface compositions.",
  ],
  anatomy:
    "A full-width native button row; `selected` renders the tint + trailing check; children carry the label.",
  variantsStates: [
    "default",
    "hover (accent sweep)",
    "selected (tint + check)",
    "disabled (inert, no hover)",
    "focus-visible (global accent ring)",
  ],
  accessibility:
    "Native button semantics; disabled uses the real attribute; Escape/outside-press come from the hosting popup.",
  related: ["MenuCard", "PopoverCard", "Select"],
});

export const capsLabelIntent: ComponentIntent = assertIntent({
  name: "CapsLabel",
  family: "Foundations",
  intent:
    "The tracked-caps section header — names a group of rows without stealing attention.",
  useWhen: [
    "Section headers inside menus, popovers, dialogs, and sidebar groups.",
  ],
  dontUseWhen: [
    "Naming a state — status rendering is its own vocabulary.",
    "Body or row text — headers only.",
  ],
  anatomy:
    "One div: the caps type token, wide tracking, s7 ink, menu-row padding.",
  variantsStates: ["default"],
  accessibility:
    "Visual grouping; pair with aria-label/role=group on the container when the grouping is semantic.",
  related: ["MenuCard", "MenuItem"],
});
