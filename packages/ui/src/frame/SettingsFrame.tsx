/** Layout primitives for a searchable, sectioned settings dialog: search head, TOC rail, and rows. */
import { Button } from "../actions/Button";
import { cx } from "../cx";

/** Search owns the dialog head, like VS Code — it filters rows across sections. */
export function DialogSearchHead({
  value,
  onChange,
  onClose,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5 border-b-2 border-edge px-4 py-2.5">
      <span className="text-body text-s7">⌕</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-quiet flex-1 bg-transparent text-sec font-semibold text-s2 outline-none placeholder:text-s7"
      />
      <Button
        variant="ghost"
        icon
        aria-label="close settings"
        onClick={onClose}
        className="-mr-1 h-6 w-6 text-body"
      >
        ✕
      </Button>
    </div>
  );
}

/** The TOC rail — while searching it reflects only sections that still match,
 *  and `activeId: null` (search mode) marks nothing. */
export function TocRail({
  entries,
  activeId,
  onJump,
}: {
  entries: { id: string; title: string }[];
  activeId: string | null;
  onJump: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="w-32 flex-none border-r-2 border-edge py-2">
      {entries.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onJump(s.id)}
          className={cx(
            // Menu-row vocabulary on paper: accent sweep on hover, darker
            // cream tint marks the active section.
            "slip flex w-full cursor-pointer items-center px-4 py-[5px] text-left text-sec font-semibold",
            s.id === activeId
              ? "bg-s11 text-edge"
              : "text-s6 hover:bg-accent hover:text-edge",
          )}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}

/** One setting: name + description + an inline control. */
export function SettingRow({
  name,
  desc,
  children,
}: {
  name: string;
  desc: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-sec font-semibold text-s2">{name}</div>
        <div className="mt-0.5 text-meta leading-[1.4] text-s7">{desc}</div>
      </div>
      {children}
    </div>
  );
}
