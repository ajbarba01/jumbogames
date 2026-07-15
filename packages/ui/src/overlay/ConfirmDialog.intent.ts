/**
 * Intent declaration for ConfirmDialog, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const confirmDialogIntent: ComponentIntent = assertIntent({
  name: "ConfirmDialog",
  family: "Overlays",
  intent:
    "A titled modal that gates a consequential action behind an explicit confirm.",
  useWhen: [
    "An action is destructive or hard to reverse (end a tournament, remove a team).",
    "A single stray click should not trigger the outcome.",
  ],
  dontUseWhen: [
    "The action is cheap and reversible (just do it, offer undo instead).",
    "A rich, multi-field flow is needed (compose ModalShell directly).",
  ],
  anatomy:
    "ModalShell wrapping a display title, an optional description line, and a cancel/confirm button pair; cancel is first so the focus trap lands there.",
  variantsStates: [
    "default · busy (both actions disabled while the request runs) · closed (renders nothing)",
  ],
  accessibility:
    "Inherits ModalShell's labelled dialog, focus trap, and Escape/scrim dismissal (which cancel); weight is in the copy, not color, per the status-vocabulary law.",
  related: ["ModalShell", "Button"],
});
