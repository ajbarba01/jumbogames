/**
 * Intent declaration for CodeInput, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const codeInputIntent: ComponentIntent = assertIntent({
  name: "CodeInput",
  family: "Inputs",
  intent:
    "Segmented entry for a short fixed-length code, one cell per character.",
  useWhen: [
    "Joining by a game/team code read off a projector.",
    "Any known-length alphanumeric code where per-character cells aid legibility.",
  ],
  dontUseWhen: [
    "Free-length or free-text entry (use TextField).",
    "The value is one of a known set (use Select).",
    "A very long code where segmentation stops helping — prefer a single field.",
  ],
  anatomy:
    "A labelled group of single-character inputs; typing advances, backspace steps back, paste distributes, and focus jumps to the first empty cell so entry stays gapless. Each cell owns the browser's caret and selection. An optional hidden aggregate carries the value for form posts.",
  variantsStates: [
    "default · empty (per-cell ghost placeholder) · hover (cell sticker lift) · focus (global accent ring) · disabled (s3 face, no hover) · invalid (crit border on cells) · complete (fires onComplete)",
  ],
  accessibility:
    "role=group with an accessible name; each cell is a labelled textbox with its own caret and selection; mono voice is the register's sanctioned code treatment; invalid must be mirrored by text the caller renders, not color alone.",
  related: ["TextField", "Select"],
});
