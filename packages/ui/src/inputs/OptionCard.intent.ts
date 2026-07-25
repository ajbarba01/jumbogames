/**
 * Intent declaration for OptionCard, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const optionCardIntent: ComponentIntent = assertIntent({
  name: "OptionCard",
  family: "Inputs",
  intent:
    "A sticker card that toggles on press, for picking several options out of a small visible set.",
  useWhen: [
    "Choosing a subset from a handful of options that each need a line of explanation.",
    "The options deserve more room than a checkbox row gives them.",
  ],
  dontUseWhen: [
    "Exactly one option may be chosen (use Select or a radio group).",
    "The set is long enough to need scrolling or search (use a menu).",
    "The control is a binary setting (use Toggle).",
  ],
  anatomy:
    "A full-width button holding a title, an optional description, and a trailing check that appears when selected; the selected face also takes a tint.",
  variantsStates: [
    "unselected · selected (tint + check) · hover · pressed · disabled (dimmed, inert)",
  ],
  accessibility:
    "A button with aria-pressed carrying the selection state; the check is decorative, so selection is never conveyed by the marker alone.",
  related: ["Toggle", "MenuItem", "Select"],
});
