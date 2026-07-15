/**
 * Card: the kit's raised content surface — a board sticker (dark ground, black
 * edge border, hard offset shadow) carrying a low-contrast grid. The one
 * primitive for framing a self-contained block of content on the board.
 */
import { cx } from "../cx";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({
  className,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <div
      className={cx("sticker surface-grid bg-s2 text-s11", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
