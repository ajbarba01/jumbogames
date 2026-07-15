/** Intent declaration for ZoomProvider/useZoom — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "./lib/intent";

export const zoomIntent: ComponentIntent = assertIntent({
  name: "ZoomProvider / useZoom",
  family: "Seams",
  intent:
    "The app-scale seam: pointer→layout math divides by the host's zoom factor instead of hardcoding it.",
  useWhen: [
    "A kit component converts viewport pointer coordinates into layout px (drag seams, sliders).",
    "A host whose zoom mechanism does NOT rescale pointer coordinates (a CSS-based body zoom) wraps the app in ZoomProvider with its factor.",
  ],
  dontUseWhen: [
    "The browser's native page zoom — it already reports pointer coordinates in layout px; the default factor 1 is correct, wrap nothing.",
    "Styling — zoom is a coordinate-space concern, never a size token.",
  ],
  anatomy:
    "A React context defaulting to 1; ZoomProvider sets it, useZoom() reads it.",
  variantsStates: [
    "default 1 (tests, unzoomed or page-zoomed hosts)",
    "provided factor (CSS-zoom hosts)",
  ],
  accessibility: "None — an invisible coordinate seam.",
  related: ["StepSlider"],
});
