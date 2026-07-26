/**
 * The background doodle field: every authored doodle rendered as N stacked
 * frames that a CSS keyframe cycles, producing a hand-drawn stop-motion boil.
 * Positioned absolutely within its host, so the app can mount it fixed behind
 * every page while /showcase hosts it inside a contained tuning preview.
 * Decorative and aria-hidden. The boil is pure CSS — no timer runs in JS.
 */
import { jitterFrames } from "./jitter";
import type { DoodleSettings } from "./settings";
import { DOODLES, strokeFor } from "./specs";

// Coprime with the doodle count, so per-doodle seeds never collide.
const SEED_STRIDE = 7919;

export function DoodleField({
  amplitude,
  frames,
  fps,
  density,
  opacity,
  strokeScale,
  mix,
}: DoodleSettings): React.JSX.Element {
  const cycle = frames / fps;
  // The authored order alternates across the page, so taking a prefix thins
  // the field evenly instead of emptying one side of it.
  const shown = DOODLES.slice(
    0,
    Math.max(1, Math.round(DOODLES.length * density)),
  );

  return (
    <>
      {shown.map((doodle, i) => {
        const paths = jitterFrames(
          doodle.d,
          amplitude,
          i * SEED_STRIDE,
          frames,
        );
        return (
          <svg
            key={i}
            width={doodle.w}
            height={doodle.h}
            viewBox={doodle.box}
            className="absolute"
            style={{
              left: doodle.left,
              top: doodle.top,
              opacity: doodle.opacity * opacity,
              transform: doodle.rotate
                ? `rotate(${doodle.rotate}deg)`
                : undefined,
            }}
          >
            {paths.map((d, frame) => (
              <path
                key={frame}
                className="doodle-frame"
                d={d}
                stroke={strokeFor(doodle, i, mix)}
                strokeWidth={doodle.sw * strokeScale}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  {
                    "--doodle-cycle": `${cycle}s`,
                    animationName: `doodle-boil-${frames}`,
                    // Each doodle starts at its own point in the cycle, or the
                    // whole field ticks in lockstep and reads as a strobe.
                    animationDelay: `${-((frame / frames) * cycle + (i * cycle) / DOODLES.length)}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </svg>
        );
      })}
    </>
  );
}
