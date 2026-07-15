/** Two-state boolean switch: accent fill when on, dark square thumb. */
import { Switch } from "@base-ui/react/switch";
import { cx } from "../cx";

export interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Boxy switch: ON is an ACCENT fill with the dark square thumb — selection is
 *  the accent's job in this register, and the status hues stay reserved for
 *  the indicator law. Base UI owns the switch semantics; the kit owns the
 *  geometry (sized up with the register scale). */
export function Toggle({
  on,
  onChange,
  disabled = false,
  ...aria
}: ToggleProps): React.JSX.Element {
  return (
    <Switch.Root
      // a real button: honest disabled semantics + focus/keyboard for free
      render={<button type="button" />}
      nativeButton
      checked={on}
      onCheckedChange={(next) => onChange(next)}
      disabled={disabled}
      className={cx(
        "slip relative h-[22px] w-[40px] flex-none rounded-r1 border-2",
        disabled
          ? "cursor-default border-s4 bg-s2"
          : cx(
              "cursor-pointer",
              on ? "border-edge bg-accent" : "border-s7 bg-s3",
            ),
      )}
      {...aria}
    >
      <Switch.Thumb
        className={cx(
          "slip-move absolute top-[3px] h-[12px] w-[12px]",
          on ? "left-[22px]" : "left-[3px]",
          disabled ? "bg-s5" : on ? "bg-edge" : "bg-s9",
        )}
      />
    </Switch.Root>
  );
}
