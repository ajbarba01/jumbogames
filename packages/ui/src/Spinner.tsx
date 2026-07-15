/** The kit's loading indicator: a delayed-reveal ticking square for content that isn't ready yet. */
import { cx } from "./cx";

export interface SpinnerProps {
  /** What is loading — the status's accessible name. */
  label: string;
  className?: string | undefined;
}

/** The loading square: an accent game token ticking through 8 stop-motion
 *  frames (`.spin-step`) — loading is active, so it earns the accent, and
 *  the stepped rotation is the register's motion voice. It reveals 120ms
 *  late (`.spinner-reveal`, tokens.css) so a fast transition never flashes
 *  it. Reduced motion swaps the tick for a pulse. */
export function Spinner({ label, className }: SpinnerProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx("spinner-reveal inline-flex", className)}
    >
      <span className="spin-step block h-3.5 w-3.5 border-2 border-edge bg-accent motion-reduce:animate-pulse" />
    </span>
  );
}
