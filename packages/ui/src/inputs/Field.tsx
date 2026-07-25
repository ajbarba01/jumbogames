/**
 * Form-field wrapper: the register's caps label with an optional detail
 * suffix, an arbitrary control, and one message slot where an error displaces
 * the helper. Exists so every form on the product spells a field the same way
 * rather than each surface re-deriving label and error typography.
 */
import { cx } from "../cx";

export interface FieldProps {
  /** Caps label above the control. */
  label: string;
  /** Secondary text beside the label, e.g. "1 of 2 picked". */
  detail?: string;
  /** Guidance shown when there is no error. */
  helper?: string;
  /** Error message; displaces the helper and is announced. */
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  detail,
  helper,
  error,
  children,
  className,
}: FieldProps): React.JSX.Element {
  return (
    // No width of its own: the field is as wide as the column it sits in, so
    // it holds at the 207px floor (docs/UI.md, fluid law).
    <div className={cx("flex w-full min-w-0 flex-col gap-1", className)}>
      <span className="text-caps font-bold uppercase tracking-widest text-s8">
        {label}
        {detail && (
          <span className="text-s6">
            {" · "}
            <span>{detail}</span>
          </span>
        )}
      </span>
      {children}
      {error ? (
        <p role="alert" className="text-meta font-bold text-crit">
          {error}
        </p>
      ) : helper ? (
        <p className="text-meta text-s7">{helper}</p>
      ) : null}
    </div>
  );
}
