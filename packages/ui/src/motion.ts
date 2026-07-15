/**
 * Thunk motion constants for JS animation consumers (the motion library).
 * Mirrors tokens.css so no raw values cross the CSS/JS seam. The SLIP_*
 * names are the kit's stable motion API; the profile behind them is Thunk
 * (one small settle past the target — tokens.css `--ease-thunk`).
 */
export const SLIP_EASE = [0.34, 1.4, 0.64, 1] as const;

export const SLIP_DUR = {
  swift: 0.1,
  base: 0.18,
  move: 0.24,
  enter: 0.22,
} as const;
