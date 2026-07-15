/** Discrete slider over a small ordered set of named stops — not a continuous range. */
import { Slider } from "@base-ui/react/slider";
import { cx } from "../cx";

export interface StepSliderProps<T extends string> {
  stops: readonly T[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
}

/** A discrete step slider: named stops, boxy thumb. Base UI owns pointer,
 *  keyboard, and aria mechanics (value = the stop index); the kit maps
 *  index↔name and draws the rail. The thumb, fill, and ticks live inside the
 *  4px-inset track so Base UI's percent positioning lands on the track's
 *  exact geometry. */
export function StepSlider<T extends string>({
  stops,
  value,
  onChange,
  "aria-label": ariaLabel,
}: StepSliderProps<T>): React.JSX.Element {
  const idx = stops.indexOf(value);
  const last = stops.length - 1;

  return (
    <Slider.Root
      value={idx}
      min={0}
      max={last}
      step={1}
      onValueChange={(v) => {
        const next = stops[v];
        if (next && next !== value) onChange(next);
      }}
    >
      <Slider.Control className="relative h-6 cursor-pointer touch-none px-1">
        <Slider.Track className="absolute top-1/2 right-1 left-1 h-[4px] -translate-y-1/2 bg-s5">
          {/* filled span up to the thumb */}
          <Slider.Indicator className="slip-move absolute inset-y-0 bg-s9" />
          {/* stop ticks */}
          {stops.map((s, i) => (
            <span
              key={s}
              data-testid="step-tick"
              className={cx(
                "absolute top-1/2 h-[10px] w-[3px] -translate-x-1/2 -translate-y-1/2",
                i <= idx ? "bg-s9" : "bg-s6",
              )}
              style={{ left: `${(i / last) * 100}%` }}
            />
          ))}
          {/* accent sticker thumb: the one loud element on the rail */}
          <Slider.Thumb
            aria-label={ariaLabel}
            getAriaValueText={(_, v) => stops[v] ?? ""}
            className="slip-move absolute top-1/2 h-[18px] w-[11px] -translate-x-1/2 -translate-y-1/2 border-2 border-edge bg-accent"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
