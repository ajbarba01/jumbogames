/**
 * Intent declaration for TextField, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const textFieldIntent: ComponentIntent = assertIntent({
  name: "TextField",
  family: "Inputs",
  intent: "Single-line free-text entry on a form or inline surface.",
  useWhen: [
    "Collecting a short typed value (email, name, code).",
    "A form field whose value is not an enumerable choice.",
  ],
  dontUseWhen: [
    "The value is one of a known set (use Select).",
    "A boolean (use Toggle) or a bounded number (use StepSlider).",
    "Multi-line prose (add a TextArea member instead of stretching this one).",
  ],
  anatomy: "One native input; border carries hover/focus/invalid state.",
  variantsStates: [
    "default · hover (border s5) · focus (border s7, no ring) · disabled (s3 face, no hover) · invalid (crit border)",
  ],
  accessibility:
    "Native input semantics; label via <label> or aria-label; invalid state must be mirrored by text the caller renders, not color alone.",
  related: ["Select", "Toggle", "StepSlider"],
});
