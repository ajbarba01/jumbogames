/**
 * Intent declaration for Tabs, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const tabsIntent: ComponentIntent = assertIntent({
  name: "Tabs",
  family: "Frame",
  intent:
    "A segmented bar that switches between two or three peer views of the same surface.",
  useWhen: [
    "One surface holds peer views a viewer moves between freely, like a game's board and team room.",
    "A view is not available yet and its absence needs explaining rather than hiding.",
  ],
  dontUseWhen: [
    "The destinations are separate routes (use links).",
    "There are more than about four views, or their labels do not fit the floor width.",
    "The choice submits a value (use Select or OptionCard).",
  ],
  anatomy:
    "A tablist of sticker-faced buttons; the selected one takes the pressed face and a tint, a disabled one dims but stays present.",
  variantsStates: [
    "unselected · selected (pressed face + tint) · hover · focus · disabled (dimmed, announced, not activatable)",
  ],
  accessibility:
    "role=tablist with an aria-label; each tab is role=tab with aria-selected and aria-controls pointing at the consumer's panel id. Only the selected tab is in the tab order; Left and Right move selection and skip disabled tabs. Disabled tabs use aria-disabled rather than the disabled attribute, so they stay reachable and announced.",
  related: ["Button", "StatusLine", "Select"],
});
