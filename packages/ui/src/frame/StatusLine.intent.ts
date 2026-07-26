/**
 * Intent declaration for StatusLine, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const statusLineIntent: ComponentIntent = assertIntent({
  name: "StatusLine",
  family: "Frame",
  intent:
    "One quiet line stating a status or predictive notice, docked to the surface it concerns.",
  useWhen: [
    "A control is unavailable and the reason is worth saying, e.g. a team in a live match.",
    "A surface is waiting on something outside the viewer's control.",
    "A recoverable failure needs a line plus a retry.",
  ],
  dontUseWhen: [
    "The message must interrupt (use ConfirmDialog).",
    "The text belongs to a single form field (use Field's error slot).",
    "The state is permanent decoration rather than a status.",
  ],
  anatomy:
    "A dot in the status hue, the message, and an optional trailing action.",
  variantsStates: [
    "info (quiet) · warn · ok · crit · run",
    "static · live (announced)",
  ],
  accessibility:
    "The dot is decorative and aria-hidden, so the hue never carries meaning alone. Live mode adds role=status so a change is announced without stealing focus.",
  related: ["Field", "ConfirmDialog", "Tabs"],
});
