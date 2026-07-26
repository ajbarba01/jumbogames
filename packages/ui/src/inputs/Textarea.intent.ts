/**
 * Intent declaration for Textarea, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const textareaIntent: ComponentIntent = assertIntent({
  name: "Textarea",
  family: "Inputs",
  intent:
    "Multi-line free-text entry: TextField's paper face over several rows.",
  useWhen: [
    "Prose that routinely outgrows one line — a trivia prompt, a description.",
    "A field whose content the author needs to read back in full while editing.",
  ],
  dontUseWhen: [
    "One-line values (use TextField).",
    "A fixed-length code entry (use CodeInput).",
  ],
  anatomy:
    "A paper-sticker textarea with the register's entry padding, vertical-only resize, and the caller's own row count.",
  variantsStates: ["default · hover · focus-visible · invalid · disabled"],
  accessibility:
    "No label of its own — the caller supplies aria-label or wraps it in Field and names the control; focus draws the global accent ring.",
  related: ["TextField", "Field", "CodeInput"],
});
