/**
 * Intent declaration for CopyCode, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const copyCodeIntent: ComponentIntent = assertIntent({
  name: "CopyCode",
  family: "Actions",
  intent:
    "Displays a short code in accent mono and copies it to the clipboard on click.",
  useWhen: [
    "Showing a game/join code the host reads aloud and wants to share.",
    "Any short literal a viewer will want to copy rather than retype.",
  ],
  dontUseWhen: [
    "The value is editable (use CodeInput or TextField).",
    "Copying long or structured content where a code chip misreads (use a labelled field).",
  ],
  anatomy:
    "A button whose face is the code itself (mono, accent) plus a copy glyph that flips to a check with an sr-only status on success.",
  variantsStates: [
    "default · hover (glyph brightens) · copied (check + 'Copied' status, ~1.5s) · unavailable (clipboard blocked: no confirmation)",
  ],
  accessibility:
    "A labelled button ('Copy code {value}'); success is announced through a role=status live region, not color alone.",
  related: ["CodeInput", "Button"],
});
