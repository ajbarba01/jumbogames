/**
 * Button Masher's emblem: a button cap with impact rings coming off it. Held
 * to the same rules as every emblem (docs/UI.md) — one monochrome silhouette
 * in a 48-unit box, drawn in `currentColor` — even though the stub is devOnly
 * and never reaches a player, because the harness and the showcase render it
 * beside the real one and a placeholder there would hide sizing problems.
 */
export function StubEmblem({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <circle cx="24" cy="28" r="9" fill="currentColor" />
      <circle cx="24" cy="28" r="15" stroke="currentColor" strokeWidth="3" />
      <path
        d="M18 9 L20 15 M24 6 V13 M30 9 L28 15"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
      />
    </svg>
  );
}
