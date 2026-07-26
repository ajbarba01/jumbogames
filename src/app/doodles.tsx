/**
 * The app-wide doodle background: the field, fixed behind every surface at the
 * shipped settings. Per docs/UI.md the doodle register lives on the background
 * only, never on components. Decorative and aria-hidden; colours are theme
 * tokens, so a scale swap recolours the whole layer.
 */
import { DoodleField } from "@/components/doodles/DoodleField";
import { DOODLE_SETTINGS } from "@/components/doodles/settings";

export function Doodles(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <DoodleField {...DOODLE_SETTINGS} />
    </div>
  );
}
