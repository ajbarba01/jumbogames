/** Intent declaration for SlamWipe — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "./lib/intent";

export const slamWipeIntent: ComponentIntent = assertIntent({
  name: "SlamWipe",
  family: "Foundations",
  intent:
    "The full-viewport accent panel that slaps in, holds, and slaps away — the app-wide route-transition and loading surface.",
  useWhen: [
    "An app-wide navigation is swapping the visible surface and needs a moment to cover the seam.",
    "A parent state machine is driving the wipe's cover/hold/uncover choreography (route transitions, forced full-screen loads).",
  ],
  dontUseWhen: [
    "A local loading state inside an existing surface — reach for Spinner instead.",
    "Anything the component itself should time or route — SlamWipe is presentational only, it never owns a timer or a navigation.",
  ],
  anatomy:
    "A motion.div pinned fixed inset-0 on the --z-wipe layer, painted bg-accent-2, sliding between off-screen-left, covering, and off-screen-right on WIPE_EASE/WIPE_DUR; an optional uppercase destination label centered in it, and an optional Spinner cue pinned near the bottom for loads that outlast the cover.",
  variantsStates: [
    'phase="in" (sweeping from off-screen-left to covering)',
    'phase="covered" (resting, fully covering)',
    'phase="out" (sweeping from covering to off-screen-right)',
    "labeled (destination label shown) vs unlabeled",
    "showCue (still-loading cue shown) vs quiet",
    "reduced-motion (sweep collapses to an instant cut)",
  ],
  accessibility:
    "The destination label is plain visible text, not announced separately. The still-loading cue delegates its role=status/aria-label entirely to Spinner (labelled 'Still loading') rather than nesting a second status role, and it is not aria-hidden so assistive tech can still reach it.",
  related: ["Spinner"],
});
