/**
 * Intent declaration for ScorePop, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const scorePopIntent: ComponentIntent = assertIntent({
  name: "ScorePop",
  family: "Surface",
  intent:
    "The springy ±N annotation that fires once as a point lands on a game surface.",
  useWhen: [
    "A score the viewer owns changes at a game beat and the change deserves to be felt.",
    "A gain and a loss need to read differently at a glance.",
  ],
  dontUseWhen: [
    "The number is chrome rather than a game beat — everyday values change without ceremony.",
    "The change is continuous rather than a discrete beat.",
  ],
  anatomy:
    "An absolutely-positioned hand-voice ±N that rises off the value it annotates, tilting with the sign.",
  variantsStates: [
    "gain (done hue, tilts right) · loss (critical hue, tilts left)",
    "idle (renders nothing until the first beat)",
  ],
  accessibility:
    "Decorative and aria-hidden — the value it annotates is already on screen as live text, so announcing the pop would double-report it. Collapses to no motion under an ancestor MotionConfig reducedMotion='user', which every game surface mounts.",
  related: ["StatusLine", "TeamChip"],
});
