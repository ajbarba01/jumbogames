/** Intent declaration for Card — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const cardIntent: ComponentIntent = assertIntent({
  name: "Card",
  family: "Surface",
  intent:
    "A raised content surface — the board sticker for framing a block of content.",
  useWhen: [
    "Framing a self-contained block of content on the board (a form, a panel, a summary).",
    "A surface that should read as raised off the ground with the sticker chrome.",
  ],
  dontUseWhen: [
    "Floating chrome that dismisses (use MenuCard, PopoverCard, or ModalShell).",
    "A plain in-flow section that should sit flat on the ground with no shadow.",
  ],
  anatomy:
    "One div: black edge border, hard offset shadow, dark ground, and a low-contrast grid fill.",
  variantsStates: [
    "default (a static raised surface; the grid, border, and shadow are theme-owned).",
  ],
  accessibility:
    "A presentational container; the caller supplies the landmark or heading semantics for its content.",
  related: ["ModalShell", "MenuCard", "PopoverCard"],
});
