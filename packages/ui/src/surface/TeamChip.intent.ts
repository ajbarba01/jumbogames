/**
 * Intent declaration for TeamChip, compiled into COMPONENTS.md.
 */
import { assertIntent, type ComponentIntent } from "../lib/intent";

export const teamChipIntent: ComponentIntent = assertIntent({
  name: "TeamChip",
  family: "Surface",
  intent:
    "One team's identity — its palette swatch bound to its name — wherever a team is named on screen.",
  useWhen: [
    "A roster, standings row, scoreboard end, or verdict names a team.",
    "A log or event line attributes something to a team.",
  ],
  dontUseWhen: [
    "The colour would stand alone without the name — the pairing is the law, not a default.",
    "The hue is meant to report state (use the status vocabulary; team colour is identity only).",
  ],
  anatomy:
    "A palette swatch and the team name in one row, reversible so the swatch can sit outboard on a right-aligned end.",
  variantsStates: [
    "xs (log rows) · sm (rosters) · md (default) · lg (verdict stamp)",
    "default · reversed",
  ],
  accessibility:
    "The swatch is aria-hidden, so colour never carries meaning alone; the name is the accessible content. The name truncates and the swatch never shrinks, but the truncation only engages when an ancestor supplies a bounded width — `truncate` implies `white-space: nowrap`, so a call site without a width-constrained parent (a `min-w-0` chain up to something with a definite or capped width) lets a long name overflow instead of clipping.",
  related: ["Card", "StatusLine"],
});
