/** Intent declaration for Kbd — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const kbdIntent: ComponentIntent = assertIntent({
  name: "Kbd",
  family: "Foundations",
  intent: "The kbd chip — one look for every shortcut the UI names.",
  useWhen: [
    "Rendering a key or chord anywhere: the shortcuts overlay, settings rows, inline hints.",
  ],
  dontUseWhen: [
    "Describing an action without its key — plain text.",
    "A clickable control — Button; Kbd is inert.",
  ],
  anatomy:
    "One <kbd>: a miniature paper keycap — caps-scale bold text on a cream chip with a thick edge border.",
  variantsStates: ["default"],
  accessibility: "Semantic <kbd> element; reads as the key name.",
  related: ["ShortcutsOverlay", "CapsLabel"],
});
