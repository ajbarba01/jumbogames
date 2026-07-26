/**
 * Dev-only tuning surface for the background doodle layer: every setting the
 * field takes, wired to live controls over a contained preview. It renders the
 * same DoodleField the app mounts, so what is tuned here is what ships — the
 * panel at the foot prints the literal to paste into settings.ts.
 */
"use client";

import { useState } from "react";
import { Card, Select, StepSlider } from "@jumbo/ui";
import { DoodleField } from "@/components/doodles/DoodleField";
import { DOODLE_SETTINGS } from "@/components/doodles/settings";
import type { DoodleMix } from "@/components/doodles/specs";

const FPS = ["4", "6", "8", "12"] as const;
const AMPLITUDE = ["0", "0.6", "1.2", "2", "3", "4.5"] as const;
const FRAMES = ["2", "3", "4"] as const;
const OPACITY = ["1", "1.5", "2", "3", "4.5", "6"] as const;
const DENSITY = ["0.5", "0.75", "1"] as const;
const STROKE = ["1", "1.25", "1.5", "2"] as const;
// Progressively darker grounds against the theme's authored s1 (#18110b).
const GROUND = ["#18110b", "#140e08", "#100b06", "#0b0704", "#050302"] as const;
const MIXES: readonly DoodleMix[] = ["cream", "accent", "even"];

function Knob({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  // min-w-0: a grid item's default min-width is min-content, so a slider's
  // intrinsic track width would otherwise push its column past its 1fr share.
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-caps uppercase tracking-widest text-s7">
          {label}
        </span>
        <span className="text-code text-s10">{value}</span>
      </div>
      {children}
    </div>
  );
}

export function BackgroundLab(): React.JSX.Element {
  const [fps, setFps] = useState<string>(String(DOODLE_SETTINGS.fps));
  const [amplitude, setAmplitude] = useState<string>(
    String(DOODLE_SETTINGS.amplitude),
  );
  const [frames, setFrames] = useState<string>(String(DOODLE_SETTINGS.frames));
  const [opacity, setOpacity] = useState<string>(
    String(DOODLE_SETTINGS.opacity),
  );
  const [density, setDensity] = useState<string>(
    String(DOODLE_SETTINGS.density),
  );
  const [stroke, setStroke] = useState<string>(
    String(DOODLE_SETTINGS.strokeScale),
  );
  const [ground, setGround] = useState<string>(GROUND[0]);
  const [mix, setMix] = useState<DoodleMix>(DOODLE_SETTINGS.mix);

  const settings = {
    amplitude: Number(amplitude),
    frames: Number(frames),
    fps: Number(fps),
    density: Number(density),
    opacity: Number(opacity),
    strokeScale: Number(stroke),
    mix,
  };

  const literal = `export const DOODLE_SETTINGS: DoodleSettings = {
  amplitude: ${settings.amplitude},
  frames: ${settings.frames},
  fps: ${settings.fps},
  density: ${settings.density},
  opacity: ${settings.opacity},
  strokeScale: ${settings.strokeScale},
  mix: "${settings.mix}",
};`;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* The gallery paints an opaque bg-s1 over the route, so the real fixed
          layer is invisible here — the preview hosts its own field instead. */}
      <div
        className="relative h-105 w-full overflow-hidden border-2 border-s6"
        style={{ background: ground }}
      >
        {/* Keyed so every geometry change remounts the paths and restarts the
            cycle together, rather than leaving frames mid-stagger. */}
        <DoodleField
          key={`${settings.amplitude}-${settings.frames}-${settings.fps}-${settings.density}`}
          {...settings}
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-4 p-6">
          <p className="font-display text-2xl uppercase text-s12">
            Jumbo <span className="text-accent">minigames</span>
          </p>
          <Card className="flex w-full max-w-sm flex-col gap-2 p-6">
            <span className="font-display text-lg uppercase text-s12">
              Join a game
            </span>
            <span className="text-sec text-s9">
              Content sits over the field — judge the doodles against this, not
              against an empty box.
            </span>
          </Card>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <Knob label="Boil rate" value={`${fps} fps`}>
          <StepSlider
            aria-label="Boil rate"
            stops={FPS}
            value={fps}
            onChange={setFps}
          />
        </Knob>
        <Knob label="Jitter" value={amplitude}>
          <StepSlider
            aria-label="Jitter amount"
            stops={AMPLITUDE}
            value={amplitude}
            onChange={setAmplitude}
          />
        </Knob>
        <Knob label="Frames" value={frames}>
          <StepSlider
            aria-label="Frame count"
            stops={FRAMES}
            value={frames}
            onChange={setFrames}
          />
        </Knob>
        <Knob label="Opacity" value={`${opacity}×`}>
          <StepSlider
            aria-label="Opacity multiplier"
            stops={OPACITY}
            value={opacity}
            onChange={setOpacity}
          />
        </Knob>
        <Knob label="Density" value={density}>
          <StepSlider
            aria-label="Density"
            stops={DENSITY}
            value={density}
            onChange={setDensity}
          />
        </Knob>
        <Knob label="Stroke" value={`${stroke}×`}>
          <StepSlider
            aria-label="Stroke weight"
            stops={STROKE}
            value={stroke}
            onChange={setStroke}
          />
        </Knob>
        <Knob label="Ground" value={ground}>
          <StepSlider
            aria-label="Ground darkness"
            stops={GROUND}
            value={ground}
            onChange={setGround}
          />
        </Knob>
        <Knob label="Colour mix" value={mix}>
          {/* The field face, not the chip: this sits in a form row beside
              sliders, and a chip stretched by a grid cell reads as a bar. */}
          <Select
            aria-label="Colour mix"
            size="field"
            options={MIXES}
            value={mix}
            onChange={(next) => setMix(next as DoodleMix)}
          />
        </Knob>
      </div>

      <pre className="overflow-x-auto border-2 border-s6 bg-s2 p-4 text-code text-s10">
        {literal}
      </pre>
      <p className="text-meta text-s7">
        Ground is previewed here only — taking it means editing --color-s1 in
        the theme and re-validating the scale&rsquo;s contrast as a set.
      </p>
    </div>
  );
}
