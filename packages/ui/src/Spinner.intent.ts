/** Intent declaration for Spinner — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "./lib/intent";

export const spinnerIntent: ComponentIntent = assertIntent({
  name: "Spinner",
  family: "Foundations",
  intent:
    "The loading circle — quiet s-scale ring for content that is genuinely not there yet.",
  useWhen: [
    "A cold load with nothing cached to show (first open of a round board).",
    "A deferred canvas whose content is still rendering in a transition.",
  ],
  dontUseWhen: [
    "Anything already partially visible — stream it in place instead.",
    "A running/working state that is not a load — status rendering is its own vocabulary.",
    "Decorating a button press — the press state is feedback enough.",
  ],
  anatomy:
    "A role=status span (aria-label names what loads) wearing .spinner-reveal (120ms delayed fade so fast loads never flash it), around a border-ring that spins motion-safe.",
  variantsStates: [
    "revealing (first 120ms, invisible)",
    "spinning",
    "reduced-motion (pulse)",
  ],
  accessibility:
    "role=status with a required label; the rotation is aria-hidden decoration.",
  related: ["Button"],
});
