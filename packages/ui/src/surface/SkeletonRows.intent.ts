/**
 * Intent declaration for SkeletonRows, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const skeletonRowsIntent: ComponentIntent = assertIntent({
  name: "SkeletonRows",
  family: "Surface",
  intent:
    "Holds a list's shape while its rows load, instead of a spinner in a collapsed container.",
  useWhen: [
    "A paginated or fixed-height list is fetching its first page.",
    "The loading container would otherwise resize when the data lands.",
  ],
  dontUseWhen: [
    "The wait is for one value or an action's result (use Spinner).",
    "The list is already populated and is only refreshing in place.",
  ],
  anatomy:
    "A divided list of rows, each a wide title bar over a short meta bar, pulsing together.",
  variantsStates: ["default (pulsing) · reduced motion (static)"],
  accessibility:
    "aria-hidden — purely decorative; the arriving content is what assistive tech reads.",
  related: ["Spinner", "Card"],
});
