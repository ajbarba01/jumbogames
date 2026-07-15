/**
 * Single-line text input — the kit's only free-text entry. Focus is the
 * container border step-up (inputs opt out of the focus ring, per UI.md).
 */
import { cx } from "../cx";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Invalid face: crit border. The caller owns when validity flips. */
  invalid?: boolean;
}

export function TextField({
  invalid = false,
  disabled = false,
  className,
  ...rest
}: TextFieldProps): React.JSX.Element {
  // Enabled fields wear the sticker chrome WITHOUT press travel (the field
  // must not move under a drag-selection); the light s12 fill is deliberate —
  // entry fields are paper on the board. Focus is the global accent ring
  // (the focus law), so the face itself doesn't step.
  const face = disabled
    ? "cursor-default border-2 border-s4 bg-s3 text-s6 placeholder:text-s5"
    : cx(
        "sticker sticker-hover bg-s12 font-semibold text-edge placeholder:text-s7",
        invalid && "border-crit",
      );
  return (
    <input
      disabled={disabled}
      className={cx("slip rounded-r1 px-3 py-1.5 text-sec", face, className)}
      {...rest}
    />
  );
}
