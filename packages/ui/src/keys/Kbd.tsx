/** One keybind registry drives BOTH the dispatch and the shortcuts UI, so a
 *  bind can't exist without being discoverable. The registry data lives with
 *  the app; the kit owns the vocabulary for rendering it. */
export interface Keybind {
  /** Stable command identity — what dispatch, a persisted rebinding, and every tooltip
   *  agree on. The label is prose and can be reworded; this cannot. */
  id: string;
  /** The chord, as keycaps. Empty = unbound (the command has no key). */
  keys: string[];
  label: string;
  group: string;
  /** Structural rather than a command (Escape's layer stack, a text field's Enter, a row
   *  standing for a family of keys): shown for discoverability, never rebindable. */
  fixed?: boolean;
  /** WHERE the bind answers, named for the reader ("settings"). Absent = everywhere. The app
   *  decides what a scope means and enforces it; the card only says so, because a chord
   *  that works in one place and not another has to admit that on its own row. */
  scope?: string;
}

/** The kbd chip — every surface that names a shortcut renders it with this.
 *  A miniature paper keycap (cream, edge border): self-grounded, so it reads
 *  on paper tooltips and dark boards alike. */
export function Kbd({ children }: { children: string }): React.JSX.Element {
  return (
    <kbd className="rounded-r1 border-2 border-edge bg-s12 px-1.5 py-0.5 text-caps leading-none font-bold tracking-normal text-s2">
      {children}
    </kbd>
  );
}
