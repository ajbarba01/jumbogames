/** Intent declaration for Select — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const selectIntent: ComponentIntent = assertIntent({
  name: "Select",
  family: "Inputs",
  intent:
    "Pick one value from a flat list: an accent sticker chip that grows a positioned paper option popup.",
  useWhen: [
    "Settings rows and toolbars choosing one of a few named values (theme, density).",
  ],
  dontUseWhen: [
    "Rich option rows with glyphs or descriptions — PopoverCard + MenuItem.",
    "Two states — Toggle.",
    "Free text — a text input.",
  ],
  anatomy:
    "Controlled Base UI Select (Root/Trigger/Value/Portal/Positioner/Popup/Item); the popup wears menuSurface below the trigger; the selected item carries the trailing check.",
  variantsStates: [
    "closed",
    "open (trigger holds the pressed face)",
    "item hover/highlighted (accent sweep)",
    "item selected (tint + check)",
    "focus-visible (global accent ring)",
  ],
  accessibility:
    "Base UI combobox/listbox semantics with typeahead and keyboard selection; Escape runs through the kit dismiss-layer stack; selection mirrored by aria-selected.",
  related: ["PopoverCard", "MenuItem", "Toggle"],
});
