/**
 * Tug O' Lore's emblem: the rope run between its two team walls, with a
 * question mark riding where the knot goes. Both halves of the name in one
 * mark — the tug and the lore — so a player picking games on the create form
 * or reading a slot card at projector distance gets the game from its shape
 * before reading a word of it.
 *
 * Monochrome by law (docs/UI.md): identity is carried by silhouette, and the
 * mark draws in `currentColor` so it inherits whatever ink its surface uses.
 * Authored in a 48-unit box and scaled by the caller's width/height — the
 * strokes are deliberately thick enough to survive the 20px chip.
 */
export function TriviaEmblem({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <path d="M6 36 H42" stroke="currentColor" strokeWidth="3" />
      <rect x="2" y="27" width="4" height="18" rx="1.5" fill="currentColor" />
      <rect x="42" y="27" width="4" height="18" rx="1.5" fill="currentColor" />
      <path
        d="M16.5 11.5 A7.5 7.5 0 1 1 24 19 V25"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="square"
      />
      <rect
        x="19.25"
        y="31.25"
        width="9.5"
        height="9.5"
        rx="1.5"
        transform="rotate(45 24 36)"
        fill="currentColor"
      />
    </svg>
  );
}
