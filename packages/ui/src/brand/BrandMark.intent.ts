/** Intent declaration for BrandMark — feeds the generated component catalogue (docs/UI.md). */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const brandMarkIntent: ComponentIntent = assertIntent({
  name: "BrandMark",
  family: "Brand",
  intent:
    "A third party's own mark in its own color — identity you read without thinking.",
  useWhen: [
    "Naming an external service or sponsor on a credentials or attribution surface.",
    "A row whose subject IS the third party, where the logo is the fastest identifier.",
  ],
  dontUseWhen: [
    "Indicating state — a mark is identity, never status.",
    "Decorating app surfaces that are not about a third party (the token palette owns those).",
  ],
  anatomy:
    "One 24×24 svg path filled with the brand hex, or — when no official mark ships — a rounded monogram tile grounded in that hex.",
  variantsStates: [
    "path (bundled official mark)",
    "monogram (no mark bundled — the extensibility floor)",
    "muted (a benched provider: desaturated + dimmed, never recolored)",
  ],
  accessibility:
    'role="img" with the provider name as aria-label, so the identity survives with images or color off.',
  related: ["Button"],
});
