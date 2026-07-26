/**
 * Multi-line text entry — TextField's paper face over several rows, for prose
 * that outgrows one line (a trivia prompt runs to 500 characters). Focus is
 * the global accent ring, per UI.md's focus law.
 */
import { cx } from "../cx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Invalid face: crit border. The caller owns when validity flips. */
  invalid?: boolean;
}

export function Textarea({
  invalid = false,
  disabled = false,
  rows = 3,
  className,
  ...rest
}: TextareaProps): React.JSX.Element {
  // Same paper-on-the-board face as TextField, and the same reason it carries
  // hover but no press travel: the field must not move under a drag-selection.
  const face = disabled
    ? "cursor-default border-2 border-s4 bg-s3 text-s6 placeholder:text-s5"
    : cx(
        "sticker sticker-hover bg-s12 font-semibold text-edge placeholder:text-s7",
        invalid && "border-crit",
      );
  return (
    <textarea
      disabled={disabled}
      rows={rows}
      // Vertical-only resize: a user-widened field would break the fluid law's
      // width budget for the card it sits in.
      className={cx(
        "slip w-full min-w-0 resize-y rounded-r1 px-3 py-1.5 text-sec",
        face,
        className,
      )}
      {...rest}
    />
  );
}
