/**
 * Intent declaration for Field, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const fieldIntent: ComponentIntent = assertIntent({
  name: "Field",
  family: "Inputs",
  intent:
    "Wraps a form control with the register's caps label and a single helper/error message slot.",
  useWhen: [
    "Any labelled control on a form surface.",
    "A control that needs guidance text or a validation message beneath it.",
  ],
  dontUseWhen: [
    "The control already carries its own visible label.",
    "Laying out a settings row (use SettingRow).",
  ],
  anatomy:
    "A caps label with an optional detail suffix, the control as children, and one message line where an error displaces the helper.",
  variantsStates: [
    "default · with detail · helper · error (displaces helper, role=alert)",
  ],
  accessibility:
    "The label is visible text — the control keeps its own accessible name; errors are announced through role=alert rather than color alone.",
  related: ["TextField", "CodeInput", "SettingRow"],
});
