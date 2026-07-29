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
  The background layer **boils**: each doodle cycles a few seeded redraws of
  itself at a low frame rate, so every line quivers like stop-motion
  animation. It is pure CSS over stacked frames — no JS timer runs behind the
  app for decoration — and reduced motion pins the authored frame. The layer
  draws from the 15-colour team palette, the one documented exception to the
  team-colour rule below: it is the register's only wide-gamut set, the
  background never names a team, and inventing a second rainbow would put
  colour outside the theme. Its settings are tuned live on `/showcase`'s
  background section, which drives the same field the app mounts.
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
  and must never be read as state. One exception, recorded in DESIGN decision
  20: the background doodle layer borrows the palette as pure decoration, where
  no team is named and nothing is identified. 15 fully colorblind-safe colors is beyond the
  proven ceiling, so the name pairing is load-bearing; the palette is graded for
  maximum normal-vision distinctness with colorblind separation as a tiebreak.
- **Minigame emblems.** Every minigame carries one **monochrome** mark — a
  silhouette in `currentColor`, authored in a 48-unit box, drawn in the clean
  control vocabulary and never the hand-drawn one. It renders at three sizes
  that are **levels of detail on one idea, not three assets**: the create-form
  chip, the match-home slot card and the reveal reel, and the gate screen, where
  the game's looping demo animates that same silhouette's own parts. A minigame
  gets **no signature colour** — colour is already spent three ways (accent
  pair, status hues, team palette), and a fourth axis would sit on the same
  screen as the first and third; shape is what has to read at 20px anyway.
  Emblems and demos are game-surface art, not kit members, on the grounds the
  "Game surfaces" section below records. Both are required of every minigame:
  a game without an emblem is a nameless card in the reveal, and one without a
  demo is a wall of text at the gate.
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
  values). A shared element whose target is the viewport edge is the
  exception and takes the no-overshoot curve (`SLIP_EASE_OUT`) — past full
  screen there is nothing to settle into, so the overshoot reads as elastic
  instead of as weight. The CSS classes and SLIP_* constants keep the
  historical `slip` naming as the kit's stable motion API. Transitions own interruptible
  state; keyframes are reserved for mount/unmount, and mount animations use
  fill-mode `backwards` rather than `forwards`: a filled end-state transform
  turns the element into a containing block and would hijack a
  `position: fixed` descendant mid-animation. Reduced motion collapses every
  duration to near-zero.
- **Moments are choreographed; chrome is not.** Game beats own the big
  motion vocabulary — the slam wipe between rounds (shipped as the
  `SlamWipe` kit member), the verdict stamp, the odometer score roll, the
  springy score pop, the rejection shake (which doubles as the form-error
  affordance). The slam wipe also covers navigations that cross into or out
  of a game surface and same-URL server-render swaps at a game beat (e.g.
  lobby → round board on start), doubling as a loading cover where it
  applies — deferrals tracked in [ROADMAP.md](ROADMAP.md) — but it still
  fires only at a beat: everyday chrome (auth links, logout, admin nav)
  never borrows it. Each moment fires once at its beat and collapses under
  reduced motion. The wipe sweeps **right to left**, and ships **unlabelled**
  everywhere: the panel is a beat, not a sign, and a destination name flashed
  for a third of a second is read by nobody while making the cover feel like
  chrome. The `label` prop stays on the member and stays exercised in the
  showcase, so a future surface that genuinely wants one has it.
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
- **Fluid to the floor.** Players join by phone at a hacknight, so **375px is
  the floor width** — every real route renders at 375 with no horizontal
  scroll, and `documentElement.scrollWidth` never exceeds the viewport. There
  is no upper bound to design for: surfaces are authored fluid (percentage,
  `flex`, `min()`, `clamp()`) and breakpoint prefixes are the **exception**,
  reached for only when a layout must genuinely re-form — a column count, a
  rail that becomes a drawer. A fixed pixel size is a promise the narrowest
  viewport has to keep, so **no kit primitive may demand more width than the
  narrowest card it can sit in**: at the floor that budget is **207px** — the
  page's `p-8` gutters, the card's 3px sticker border, and its `p-6` padding
  eat the rest. Do that arithmetic in rem, not px: the register runs the root
  at **145%** for projector legibility, so a spacing step is 5.8px and `p-8`
  is 46px, not 32. A 375px phone therefore has the layout room of a ~259px
  one, which is what makes the floor bite this hard.
  Fixed sizes remain correct where the element is inherently fixed —
  an icon button, a toggle, a keycap — because those stay under the budget at
  any viewport. Projector surfaces are read at the other extreme, but the
  floor still binds: a spectator's phone loads the same route.
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
- **Declare what squeezes.** A flex or grid child's automatic minimum size is
  its content, not zero — so a long name, a wide input, or a nested flex row
  refuses to shrink and pushes its siblings out of the card instead. Every row
  built under the fluid law states its intent explicitly: a child that may be
  squeezed carries `min-w-0` (plus `truncate` if it is text), and a label, tag,
  or icon that must keep its size carries `shrink-0`. Neither is decoration —
  an unmarked row is an untested assumption about content length. When a row
  runs out of width, prefer in this order: **shrink** the one child that can
  lose width without losing meaning; **wrap** (`flex-wrap`) when the children
  are peers of similar weight, such as a control cluster; **scroll** only for
  content that is inherently wide and browsable — a table, a code block — in
  its own `overflow-x-auto` container, never the page. The page itself never
  scrolls sideways.
- **Semantic z-index scale.** Layers stack by name — sticky, modal-backdrop,
  modal, dropdown, toast, tooltip — never by an arbitrary number. Dropdown
  ranks above modal on purpose: a select portaled from inside a dialog has
  to paint over it.
- **The showcase is the living spec.** Every kit member renders in every
  state on the dev-only `/showcase` route; a component is critiqued and
  hardened there before it graduates into the kit.

## Game surfaces

- Projector legibility: the round board and spectate surfaces are read from
  meters away — type steps up, status vocabulary unchanged. A surface that is
  read as a _diagram_ rather than played — the gate demo — takes a compact size
  instead, declared as a prop on the indicator rather than by scaling the band:
  play size is tuned for a projector and buries the gate's ready button.
- The reveal is not its own screen. It is match home with the chrome hidden and
  the cards spinning, so the cards never move when it resolves. A beat that
  relocates its own subject at the moment of resolution reads as a lurch, and
  the fix is layout, not easing.
- Reduced motion is first-class: every motion-layer animation (zoom,
  slot-machine, round transitions) collapses to instant via MotionConfig
  reducedMotion="user"; CSS durations collapse via the tokens.
- Game-layer animation uses the motion library with SLIP_EASE/SLIP_DUR from
  the kit — the Thunk profile crosses the CSS/JS seam by constant, not by
  copied number.

---

_Last reviewed: 2026-07-28_
