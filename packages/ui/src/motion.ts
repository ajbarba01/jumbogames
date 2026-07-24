/**
 * Thunk motion constants for JS animation consumers (the motion library).
 * Mirrors tokens.css so no raw values cross the CSS/JS seam. The SLIP_*
 * names are the kit's stable motion API; the profile behind them is Thunk
 * (one small settle past the target — tokens.css `--ease-thunk`).
 */
export const SLIP_EASE = [0.34, 1.4, 0.64, 1] as const;

/**
 * Rejection-shake keyframes (docs/UI.md): the register's form-error / illegal-
 * move affordance — a quick horizontal jitter that settles at rest. Consumed as
 * a motion `x` keyframe array; the amplitude lives here so the CSS/JS seam is
 * crossed by constant, not copied number (same principle as SLIP_EASE).
 */
export const SLIP_SHAKE = [0, -9, 8, -6, 5, -3, 0] as const;

export const SLIP_DUR = {
  swift: 0.1,
  base: 0.18,
  move: 0.24,
  enter: 0.22,
} as const;

/**
 * The slam-wipe moment (docs/UI.md): a covering panel that slaps across the
 * viewport, holds while the next surface loads, then slaps away. `in`/`out` are
 * the sweep durations; `minCovered` is the floor so a fast navigation still
 * reads as a full wipe; `maxCovered` is the threshold past which a still-loading
 * cue appears. Seconds. Expo curve so the panel snaps rather than eases.
 */
export const WIPE_EASE = [0.83, 0, 0.17, 1] as const;

export const WIPE_DUR = {
  in: 0.36,
  out: 0.36,
  minCovered: 0.3,
  maxCovered: 3,
} as const;
