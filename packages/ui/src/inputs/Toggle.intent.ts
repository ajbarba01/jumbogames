/** Intent declaration for Toggle — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const toggleIntent: ComponentIntent = assertIntent({
  name: "Toggle",
  family: "Inputs",
  intent:
    "The boxy two-state switch: accent fill when on — selection is the accent's job; status hues stay reserved for the indicator law.",
  useWhen: [
    "Settings rows and inline controls flipping one boolean (reduce motion, autosave).",
  ],
  dontUseWhen: [
    "A momentary action — Button.",
    "More than two choices — Select or StepSlider.",
  ],
  anatomy:
    "Base UI Switch rendered as a real button (honest disabled + focus semantics) with a slip-move thumb.",
  variantsStates: [
    "off",
    "on (accent fill, edge thumb)",
    "disabled off/on (inert, dimmed, no hover)",
    "focus-visible (global accent ring)",
  ],
  accessibility:
    "Native switch role via Base UI; space/enter toggle; disabled uses the real attribute.",
  related: ["Select", "StepSlider", "Button"],
});
