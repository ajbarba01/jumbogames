/**
 * The shipped doodle-layer settings. These are the values the tuning surface
 * on /showcase exists to choose: it renders the same field from the same
 * fields, so what is tuned there is what is pasted here.
 */
import type { DoodleMix } from "./specs";

export interface DoodleSettings {
  /** Coordinate displacement per boil frame, in the doodles' own viewBox units. */
  amplitude: number;
  /** Frames in one boil cycle. Only 2, 3 and 4 have keyframes in globals.css. */
  frames: number;
  /** Frames shown per second. */
  fps: number;
  /** Fraction of the twelve doodles that render, 0–1. */
  density: number;
  /** Multiplier over each doodle's own authored opacity. */
  opacity: number;
  /** Multiplier over each doodle's own authored stroke width. */
  strokeScale: number;
  mix: DoodleMix;
}

export const DOODLE_SETTINGS: DoodleSettings = {
  amplitude: 1.2,
  frames: 3,
  fps: 8,
  density: 1,
  opacity: 1,
  strokeScale: 1,
  mix: "cream",
};
