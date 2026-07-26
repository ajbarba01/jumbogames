/**
 * List-loading placeholder: pulsing bars in the shape of the rows that are
 * coming. The register prefers a skeleton over a spinner for a list whose
 * height is known — the surface keeps its shape instead of collapsing and
 * snapping back when the data lands.
 */
import { cx } from "../cx";

export interface SkeletonRowsProps {
  /** How many placeholder rows to draw. */
  rows?: number;
  className?: string;
}

export function SkeletonRows({
  rows = 5,
  className,
}: SkeletonRowsProps): React.JSX.Element {
  return (
    // Decorative by definition: the real content is announced when it arrives,
    // so this must not reach the accessibility tree at all.
    <ul
      aria-hidden
      className={cx(
        "animate-pulse divide-y-2 divide-s6 motion-reduce:animate-none",
        className,
      )}
    >
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3.5">
          <div className="h-3.5 w-2/3 rounded-r1 bg-s4" />
          <div className="h-2.5 w-24 rounded-r1 bg-s3" />
        </li>
      ))}
    </ul>
  );
}
