# UI — Design system

> Authority for the UI's design laws and authoring rules. The kit is
> `packages/ui` (`@jumbo/ui`); exact token values live in its `tokens.css`
> and `src/themes/`. The living spec is the dev-only `/showcase` route.
> Rationale for adopting the kit: [DESIGN.md](DESIGN.md) decision 9.

## Design laws (every surface, every component)

- **Toasted Arcade register.** The app is a game read off a projector in a
  dark room: warm near-black grounds, cream ink, and sticker chrome —
  raised controls are saturated stickers laid on the board (thick edge
  border, hard offset shadow, lift on hover, drop-onto-shadow on press; the
  `.sticker` presets own the mechanics, the theme owns the distances). Loud
  color belongs to actions and identity (the accent pair), never to state:
  attention is still earned by criticality, and admin surfaces run the same
  grammar at lower volume — fewer accents, denser type. In-flow content owns
  the darkest ground (s1); chrome — nav, headers, the admin UI — sits on
  s2. See the theming law below for what changes when the scale is replaced;
  Toasted Arcade is the single shipped theme.
- **Hand-drawn stays in the background.** Doodle accents — squiggles,
  asterisks, scribbles, the hand font — live on the background layer or as
  annotations beside content, never on interactive components: controls stay
  straight and clean so the wobble reads as set dressing, not sloppiness.
- **Status vocabulary.** The four status hues (blue running · amber
  needs-you · red critical · green done) are reserved for live state and
  never decorate chrome; the accent pair never marks state. The kit ships no
  status-indicator components — the console-era dot and meter were cut with
  the register shift; when game surfaces need indicators they are designed
  as new members against this vocabulary. Markers are **icons, never
  words** — a selected row gets a check, not a label.
- **Team palette.** Up to 15 tournament identities (`--color-team-1…15`),
  assigned in fixed order and never cycled. Team color is decorative identity,
  always shown beside the team name — it is never part of the status vocabulary
  and must never be read as state. 15 fully colorblind-safe colors is beyond the
  proven ceiling, so the name pairing is load-bearing; the palette is graded for
  maximum normal-vision distinctness with colorblind separation as a tiebreak.
- **Sentence case.** Every piece of UI copy — headings, labels, buttons,
  captions — is sentence case. Never lowercase-stylized, never Title Case.
  (CapsLabel's uppercase is a CSS transform over sentence-case source.)
- **Type voices.** Display (Archivo Black) carries game headlines and modal
  titles; sans (Space Grotesk, bold-leaning) carries every control and body;
  hand (Gaegu) is reserved for doodle-layer annotations. Mono exists as a
  token for literal code and the team-code entry only — it never styles UI
  chrome (menus, dialogs, captions, buttons).
- **One outline vocabulary.** Three treatments, nothing else. **Paper
  stickers** — cream s12 ground, edge border, hard offset shadow — for
  raised surfaces read up close: entry fields, menus and popover hosts
  (their rows are MenuItem/CapsLabel), select popups, tooltips, float cards,
  kbd keycaps, and modals with their dialog frames — floating content is ink
  on paper. Rows on paper are bold ink with the accent-sweep hover. **Board
  stickers** — dark s2 ground, thick s11 border, hard offset shadow — for
  game surfaces (their content keeps dark-register roles). Ghost, text, and
  outline buttons are ground-adaptive (they inherit the surface ink), so
  they work on either. **Structure lines** (2px, s6) for
  divisions inside one surface — dividers, rails — and disabled faces; menu
  and select rows divide with 2px edge lines on the paper. There are no
  1px hairlines: every outline in the register is thick. In-flow content
  sits on s1/s2 with no shadow; nothing floats without a hard shadow, and
  nothing casts a soft one.
- **Thunk motion.** Four durations — press/toggle/exit, hover/color,
  position/size, mount — on two curves: anything that moves settles with one
  small overshoot past its target (`--ease-thunk`, things land with weight);
  color and opacity ride a clean out-curve (overshoot extrapolates channel
  values). The CSS classes and SLIP_* constants keep the historical `slip`
  naming as the kit's stable motion API. Transitions own interruptible
  state; keyframes are reserved for mount/unmount, and mount animations use
  fill-mode `backwards` rather than `forwards`: a filled end-state transform
  turns the element into a containing block and would hijack a
  `position: fixed` descendant mid-animation. Reduced motion collapses every
  duration to near-zero.
- **Moments are choreographed; chrome is not.** Game beats own the big
  motion vocabulary — the slam wipe between rounds, the verdict stamp, the
  odometer score roll, the springy score pop, the rejection shake (which
  doubles as the form-error affordance). Each fires once at its beat and
  collapses under reduced motion; everyday chrome never borrows them.
  Confetti was considered and cut.
- **Focus law.** Keyboard focus draws a thick accent ring OUTSIDE the
  element (offset off its border, the mockup treatment) — on this register
  focus is loud on purpose, and text inputs wear the same ring as everything
  else. A pointer click shows nothing. Exception: borderless inline fields
  (a dialog's search head, the shortcuts filter) opt out via `.focus-quiet` —
  a ring around an edgeless field floats in space, so the caret is their
  cue. The known cost: an outside ring can clip inside a tight scroll
  container; give focusable rows breathing room rather than shrinking the
  ring.
- **Escape-stack dismissal.** One Escape authority: every dismissible surface
  (modal, dropdown, app mode) registers on a stack while open, and Escape
  closes only the topmost. Menus dismiss on an outside pointer-down; modal
  scrims guard the backdrop; a portaled menu still counts as "inside" its
  trigger.
- **Selection marker.** A selected row in a menu, picker, or select is a
  background tint plus a trailing check glyph — one vocabulary everywhere a
  value is chosen from a list, and always an icon, never a word.
- **Keybinds are a registry.** One table drives both dispatch and the
  shortcuts reference, so a bind cannot exist without being discoverable;
  shortcuts render as kbd chips.
- **Banners' function, not banners.** A status or predictive notice —
  waiting on the other team, a dropped connection — surfaces as one quiet
  line in status-vocabulary form: status hue, name, inline action, docked to
  the surface it concerns. It never takes the frame and never persists past
  relevance.

## Authoring rules (read before writing any UI)

- **Build from the kit.** Every control, surface, and piece of feedback is a
  kit component. If nothing fits, add a member to the kit itself rather than
  hand-rolling inside a page — a page composes kit pieces plus its own data,
  with no styling of its own.
- **Intent blocks + generated catalog.** Every kit member declares an intent
  (what it's for, when to use it, when not to, its anatomy, its states, its
  accessibility contract, related members). A registry test enforces that
  the declaration is present and complete and regenerates
  `packages/ui/COMPONENTS.md` from it; correctness of the declaration is a
  review judgment the test cannot make.
- **No raw values.** No literal hex, px, rem, duration, radius, or z-index in
  a component — color, space, radius, duration, and stacking come from the
  tokens.
- **Every state ships.** default · hover · focus-visible · active · disabled
  · loading · empty · error — "unpolished" almost always means an unhandled
  state. This is the checklist for graduating a prototype into the kit.
- **A theme is a full scale swap.** A theme is one CSS file: the whole
  12-step scale, the status colors, and the shadows, replaced together at
  equal quality — never a partial recolor. The current register is one such
  file; a future theme is another, held to the same bar.
- **Semantic z-index scale.** Layers stack by name — sticky, modal-backdrop,
  modal, dropdown, toast, tooltip — never by an arbitrary number. Dropdown
  ranks above modal on purpose: a select portaled from inside a dialog has
  to paint over it.
- **The showcase is the living spec.** Every kit member renders in every
  state on the dev-only `/showcase` route; a component is critiqued and
  hardened there before it graduates into the kit.

## Game surfaces

- Projector legibility: the round board and spectate surfaces are read from
  meters away — type steps up, status vocabulary unchanged.
- Reduced motion is first-class: every motion-layer animation (zoom,
  slot-machine, round transitions) collapses to instant via MotionConfig
  reducedMotion="user"; CSS durations collapse via the tokens.
- Game-layer animation uses the motion library with SLIP_EASE/SLIP_DUR from
  the kit — the Thunk profile crosses the CSS/JS seam by constant, not by
  copied number.

---

_Last reviewed: 2026-07-15_
