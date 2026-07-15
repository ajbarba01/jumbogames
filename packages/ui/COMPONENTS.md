# Component catalogue

_Generated from each component's intent declaration. Do not edit by hand._

## Actions

### Button

The six-variant action vocabulary — primary/quiet/outline/block/ghost/text pick the weight, icon swaps text padding for square icon geometry.

- **Use it when:** Any clickable control that commits an action: submit, confirm, deny, run, start, or trigger a menu. primary for the one accent action per view · quiet for the workhorse confirm · outline for secondary/deny · block for raised square utilities · ghost for chrome-adjacent icons · text for ink-only toolbar controls.
- **Don't use it when:** The control navigates to another location rather than committing an action. The control needs a loading state — this vocabulary has none; callers disable instead.
- **Anatomy:** A native <button> whose face (color/border/hover/press) and geometry (text padding or icon square) are selected per variant; disabled swaps to the off face with no hover, no press, no pointer.
- **Variants & states:** primary, quiet, outline, block, ghost, text, default · hover (sticker lift) · focus-visible (global accent ring) · active (drop onto shadow) · disabled (no hover, no pointer)
- **Accessibility:** Native <button> semantics (Enter/Space activate); type defaults to button; icon-only callers must pass aria-label; loading is not applicable in this vocabulary — callers disable instead.
- **Related:** Spinner

### CopyCode

Displays a short code in accent mono and copies it to the clipboard on click.

- **Use it when:** Showing a game/join code the host reads aloud and wants to share. Any short literal a viewer will want to copy rather than retype.
- **Don't use it when:** The value is editable (use CodeInput or TextField). Copying long or structured content where a code chip misreads (use a labelled field).
- **Anatomy:** A button whose face is the code itself (mono, accent) plus a copy glyph that flips to a check with an sr-only status on success.
- **Variants & states:** default · hover (glyph brightens) · copied (check + 'Copied' status, ~1.5s) · unavailable (clipboard blocked: no confirmation)
- **Accessibility:** A labelled button ('Copy code {value}'); success is announced through a role=status live region, not color alone.
- **Related:** CodeInput, Button

### MenuItem

The option row: bold ink on paper divided by edge lines; selection is a tint plus a trailing check, one vocabulary in every menu.

- **Use it when:** Rows inside any popup card that pick, toggle, or run something. Rich rows (glyph + two-line label) via items-start and child spans.
- **Don't use it when:** Standalone actions outside a popup — Button. Navigation rows in the shell chrome — those are surface compositions.
- **Anatomy:** A full-width native button row; `selected` renders the tint + trailing check; children carry the label.
- **Variants & states:** default, hover (accent sweep), selected (tint + check), disabled (inert, no hover), focus-visible (global accent ring)
- **Accessibility:** Native button semantics; disabled uses the real attribute; Escape/outside-press come from the hosting popup.
- **Related:** MenuCard, PopoverCard, Select

## Brand

### BrandMark

A third party's own mark in its own color — identity you read without thinking.

- **Use it when:** Naming an external service or sponsor on a credentials or attribution surface. A row whose subject IS the third party, where the logo is the fastest identifier.
- **Don't use it when:** Indicating state — a mark is identity, never status. Decorating app surfaces that are not about a third party (the token palette owns those).
- **Anatomy:** One 24×24 svg path filled with the brand hex, or — when no official mark ships — a rounded monogram tile grounded in that hex.
- **Variants & states:** path (bundled official mark), monogram (no mark bundled — the extensibility floor), muted (a benched provider: desaturated + dimmed, never recolored)
- **Accessibility:** role="img" with the provider name as aria-label, so the identity survives with images or color off.
- **Related:** Button

## Foundations

### CapsLabel

The tracked-caps section header — names a group of rows without stealing attention.

- **Use it when:** Section headers inside menus, popovers, dialogs, and sidebar groups.
- **Don't use it when:** Naming a state — status rendering is its own vocabulary. Body or row text — headers only.
- **Anatomy:** One div: the caps type token, wide tracking, s7 ink, menu-row padding.
- **Variants & states:** default
- **Accessibility:** Visual grouping; pair with aria-label/role=group on the container when the grouping is semantic.
- **Related:** MenuCard, MenuItem

### Kbd

The kbd chip — one look for every shortcut the UI names.

- **Use it when:** Rendering a key or chord anywhere: the shortcuts overlay, settings rows, inline hints.
- **Don't use it when:** Describing an action without its key — plain text. A clickable control — Button; Kbd is inert.
- **Anatomy:** One <kbd>: a miniature paper keycap — caps-scale bold text on a cream chip with a thick edge border.
- **Variants & states:** default
- **Accessibility:** Semantic <kbd> element; reads as the key name.
- **Related:** ShortcutsOverlay, CapsLabel

### Spinner

The loading circle — quiet s-scale ring for content that is genuinely not there yet.

- **Use it when:** A cold load with nothing cached to show (first open of a round board). A deferred canvas whose content is still rendering in a transition.
- **Don't use it when:** Anything already partially visible — stream it in place instead. A running/working state that is not a load — status rendering is its own vocabulary. Decorating a button press — the press state is feedback enough.
- **Anatomy:** A role=status span (aria-label names what loads) wearing .spinner-reveal (120ms delayed fade so fast loads never flash it), around a border-ring that spins motion-safe.
- **Variants & states:** revealing (first 120ms, invisible), spinning, reduced-motion (pulse)
- **Accessibility:** role=status with a required label; the rotation is aria-hidden decoration.
- **Related:** Button

## Inputs

### CodeInput

Segmented entry for a short fixed-length code, one cell per character.

- **Use it when:** Joining by a game/team code read off a projector. Any known-length alphanumeric code where per-character cells aid legibility.
- **Don't use it when:** Free-length or free-text entry (use TextField). The value is one of a known set (use Select). A very long code where segmentation stops helping — prefer a single field.
- **Anatomy:** A labelled group of single-character inputs; typing advances, backspace steps back, paste distributes, and focus jumps to the first empty cell so entry stays gapless. Each cell owns the browser's caret and selection. An optional hidden aggregate carries the value for form posts.
- **Variants & states:** default · empty (per-cell ghost placeholder) · hover (cell sticker lift) · focus (global accent ring) · disabled (s3 face, no hover) · invalid (crit border on cells) · complete (fires onComplete)
- **Accessibility:** role=group with an accessible name; each cell is a labelled textbox with its own caret and selection; mono voice is the register's sanctioned code treatment; invalid must be mirrored by text the caller renders, not color alone.
- **Related:** TextField, Select

### Select

Pick one value from a flat list: an accent sticker chip that grows a positioned paper option popup.

- **Use it when:** Settings rows and toolbars choosing one of a few named values (theme, density).
- **Don't use it when:** Rich option rows with glyphs or descriptions — PopoverCard + MenuItem. Two states — Toggle. Free text — a text input.
- **Anatomy:** Controlled Base UI Select (Root/Trigger/Value/Portal/Positioner/Popup/Item); the popup wears menuSurface below the trigger; the selected item carries the trailing check.
- **Variants & states:** closed, open (trigger holds the pressed face), item hover/highlighted (accent sweep), item selected (tint + check), focus-visible (global accent ring)
- **Accessibility:** Base UI combobox/listbox semantics with typeahead and keyboard selection; Escape runs through the kit dismiss-layer stack; selection mirrored by aria-selected.
- **Related:** PopoverCard, MenuItem, Toggle

### StepSlider

A discrete slider over a small ordered set of named levels, with a boxy thumb and per-stop ticks.

- **Use it when:** Choosing one of a few ordered named levels (reasoning effort, density).
- **Don't use it when:** Two states — Toggle. Unordered choices — Select. Continuous numeric ranges — this is stops-only by design.
- **Anatomy:** Base UI Slider (value = stop index) inside the kit rail: 4px-inset track, filled indicator, one tick per stop, 7×13 boxy thumb.
- **Variants & states:** per-stop positions, drag/click (Base UI pointer mechanics), keyboard arrows/Home/End (native range input), focus-visible (global accent ring)
- **Accessibility:** A native range input carries the slider semantics; aria-valuetext speaks the stop name, not the index.
- **Related:** Toggle, Select

### TextField

Single-line free-text entry on a form or inline surface.

- **Use it when:** Collecting a short typed value (email, name, code). A form field whose value is not an enumerable choice.
- **Don't use it when:** The value is one of a known set (use Select). A boolean (use Toggle) or a bounded number (use StepSlider). Multi-line prose (add a TextArea member instead of stretching this one).
- **Anatomy:** One native input; border carries hover/focus/invalid state.
- **Variants & states:** default · hover (border s5) · focus (border s7, no ring) · disabled (s3 face, no hover) · invalid (crit border)
- **Accessibility:** Native input semantics; label via <label> or aria-label; invalid state must be mirrored by text the caller renders, not color alone.
- **Related:** Select, Toggle, StepSlider

### Toggle

The boxy two-state switch: accent fill when on — selection is the accent's job; status hues stay reserved for the indicator law.

- **Use it when:** Settings rows and inline controls flipping one boolean (reduce motion, autosave).
- **Don't use it when:** A momentary action — Button. More than two choices — Select or StepSlider.
- **Anatomy:** Base UI Switch rendered as a real button (honest disabled + focus semantics) with a slip-move thumb.
- **Variants & states:** off, on (accent fill, edge thumb), disabled off/on (inert, dimmed, no hover), focus-visible (global accent ring)
- **Accessibility:** Native switch role via Base UI; space/enter toggle; disabled uses the real attribute.
- **Related:** Select, StepSlider, Button

## Layout

### DialogSearchHead

The dialog head where search owns the top row — typing filters the body live, VS Code style.

- **Use it when:** The head of any settings-shaped dialog whose rows are searchable.
- **Don't use it when:** A dialog with no filterable body — a plain caps header row. App-wide search — that belongs to a global search surface, not a dialog head.
- **Anatomy:** Glyph + autofocused borderless input + ghost close Button over the s3 head hairline.
- **Variants & states:** empty (placeholder), filtering (value drives the caller)
- **Accessibility:** The input opts out of the focus ring per the law (its container border is the cue); close is a labelled ghost Button.
- **Related:** ModalShell, TocRail, SettingRow

### SettingRow

One setting: name + one-line description + a trailing inline control.

- **Use it when:** Every row of a settings-shaped dialog — controls slot in as children (Toggle, Select, Kbd chips).
- **Don't use it when:** Menu options — MenuItem. Rows without a control — plain text needs no frame.
- **Anatomy:** Flex row: name (sec scale) over description (quiet s7), control pinned right.
- **Variants & states:** default (state lives in the slotted control)
- **Accessibility:** The slotted control carries the interactive semantics; name/description sit adjacent for context.
- **Related:** Toggle, Select, Kbd, TocRail

### TocRail

The dialog TOC rail: one row per section, jump on click, quiet active tint.

- **Use it when:** Sectioned dialog bodies that deserve a jump list (settings).
- **Don't use it when:** App navigation — that is the left nav, not a dialog rail. Search mode — pass activeId null so nothing claims the tint.
- **Anatomy:** A fixed-width column of full-width rows against the s3 rail hairline.
- **Variants & states:** default, hover, active (s3 tint + s12 ink), activeId null (search — no tint)
- **Accessibility:** Native buttons; the active row is also the scrolled-to section for sighted parity.
- **Related:** DialogSearchHead, SettingRow

## Overlays

### ConfirmDialog

A titled modal that gates a consequential action behind an explicit confirm.

- **Use it when:** An action is destructive or hard to reverse (end a tournament, remove a team). A single stray click should not trigger the outcome.
- **Don't use it when:** The action is cheap and reversible (just do it, offer undo instead). A rich, multi-field flow is needed (compose ModalShell directly).
- **Anatomy:** ModalShell wrapping a display title, an optional description line, and a cancel/confirm button pair; cancel is first so the focus trap lands there.
- **Variants & states:** default · busy (both actions disabled while the request runs) · closed (renders nothing)
- **Accessibility:** Inherits ModalShell's labelled dialog, focus trap, and Escape/scrim dismissal (which cancel); weight is in the copy, not color, per the status-vocabulary law.
- **Related:** ModalShell, Button

### MenuCard

The floating option surface: one skin (ground, edge, shadow, rise) for every popup.

- **Use it when:** A static or bespoke-positioned floating card (showcase specimens, custom overlays). Composing option rows or controls that need the shared popup skin without Base UI positioning.
- **Don't use it when:** A trigger-anchored popup — PopoverCard owns portal + placement. Picking one value from a flat list — Select. A blocking decision — that is a modal ground.
- **Anatomy:** One div wearing the shared menuSurface class (paper s12 ground, sticker edge, float shadow, mount rise).
- **Variants & states:** default (floating), sized by caller className
- **Accessibility:** Purely presentational; interactive semantics come from the rows composed inside.
- **Related:** PopoverCard, MenuItem, CapsLabel

### ModalShell

The modal ground: scrim + a centered paper sticker (cream, edge border, heavy hard shadow) for the few moments that block the app.

- **Use it when:** A blocking surface — settings, the shortcuts reference, a confirmation that must resolve before work continues.
- **Don't use it when:** Anchored options or controls — PopoverCard. Anything a quiet inline notice can say — modals are the loudest ground and must stay rare.
- **Anatomy:** Controlled Base UI Dialog: scrim backdrop at the modal-backdrop z, a pointer-transparent centering popup, and the animated card inside it sized by the caller.
- **Variants & states:** closed (renders nothing), open (focus trapped, scroll locked, mount rise), reduced-motion (instant)
- **Accessibility:** Base UI focus trap + labelled dialog role; scrim press dismisses; Escape runs through the kit dismiss-layer stack.
- **Related:** PopoverCard, useDismissLayer, ShortcutsOverlay

### PopoverCard

A trigger-anchored floating card on Base UI mechanics, wearing the shared menu-surface skin.

- **Use it when:** A chip or button that grows a card of options or controls (composer chips, attach menu). Any anchored popup that must escape clipping containers and reposition on scroll.
- **Don't use it when:** Picking one value from a flat list — Select. A blocking decision or form — the modal ground. Hover-only detail — a tooltip, not a popover.
- **Anatomy:** Controlled Base UI Popover (Root/Trigger/Portal/Positioner/Popup); the caller supplies the trigger element; the popup wears menuSurface at the dropdown z. An optional tooltip spec stacks Tooltip.Trigger onto the same element for hover/focus detail.
- **Variants & states:** closed, open (positioned side/align, mount rise), reduced-motion (instant)
- **Accessibility:** Base UI wires trigger aria + focus; outside-press is Base UI; Escape runs through the kit dismiss-layer stack so app-mode ordering holds.
- **Related:** MenuCard, MenuItem, useDismissLayer

### ShortcutsOverlay

The shortcuts surface: the keybind registry rendered as a grouped, searchable modal card — and, when the caller passes an `editing` seam, the place binds are rebound.

- **Use it when:** The app-wide shortcut summon (ctrl+/) — pass the same registry table that drives dispatch. Rebinding: pass `editing`. Reference and editor are ONE surface, so a bind is never discoverable in one place and changeable in another.
- **Don't use it when:** Naming one shortcut inline — Kbd. Owning the key vocabulary or the conflict policy — those come in through `editing`; this card renders and captures, it does not decide.
- **Anatomy:** A height-capped ModalShell card: caps header with reset-all + a ghost close, an autofocused filter field, then the scrolling rows — one group header per bind group, and per row: label, a scope tag where the bind only answers somewhere ("in settings"), and the CHORD FIELD: the Kbd chips (or "unbound") inside a bordered control you click into to record a new chord, plus a reset for a customised bind. The chord is the control — there is no separate record button — and while recording it holds the chord heard and a line stating what Enter will do (including whose bind it would take).
- **Variants & states:** open, closed (unmounted by the caller), read-only (no `editing`), row recording, row recording · conflict, row unbound
- **Accessibility:** Labelled dialog via ModalShell; the registry prop guarantees no bind exists without appearing here. Capture swallows every key while it runs (Escape cancels the recording rather than closing the card) so a chord under test can never also fire the command it names.
- **Related:** Kbd, ModalShell

### Tooltip

Hover/focus detail for icon-only controls — a quiet floating label, with the keybind when one exists.

- **Use it when:** An icon-only button whose meaning is not instantly readable (foot buttons, strip glyphs, chevrons). A control that has a registry keybind worth surfacing at point-of-use.
- **Don't use it when:** The control already shows its full text — a tooltip restating a label is noise. Content the user must interact with or that must persist — PopoverCard. Disabled-state explanations on elements that swallow pointer events — inline text instead.
- **Anatomy:** Base UI Tooltip (Root/Trigger/Portal/Positioner/Popup) under one app-level TooltipProvider (600ms delay, 400ms warm window); the popup wears the floating-surface skin (s3 + s5 hairline + shadow) at the tooltip z; keybinds render as Kbd chips.
- **Variants & states:** hidden, open (after delay, or instantly inside the warm window), open-from-focus (keyboard focus, no delay path), with-keybind (label + kbd chips), reduced-motion (instant)
- **Accessibility:** Base UI wires the trigger aria and opens on keyboard focus; NOT a dismiss layer — Escape falls through to real layers; triggers keep their own aria-label as the accessible name.
- **Related:** PopoverCard, Kbd

### useClickAway

Dismiss on outside pointerdown for bespoke menus; accepts several refs so a portaled card counts as inside.

- **Use it when:** A bespoke non-Base-UI overlay (e.g. a custom color picker) needs outside-click dismissal. The overlay is portaled and its trigger and portaled content must both count as "inside".
- **Don't use it when:** Base UI-backed popups — they own their own outside-press dismissal. No ref is ever mounted — there is nothing to be "outside" of.
- **Anatomy:** A document pointerdown listener that checks the pointer target against one or more ref-bound elements.
- **Variants & states:** mounted (ref bound, listens), unmounted (ref null, ignored)
- **Accessibility:** Pointer-only dismissal; pairs with useDismissLayer for keyboard (Escape) dismissal.
- **Related:** useDismissLayer

### useDismissLayer

The one Escape stack: every dismissible surface registers while open; Escape closes only the topmost.

- **Use it when:** A modal, dropdown, or app mode (e.g. search) needs to close on Escape. Several dismissible surfaces can be open at once and must pop in reverse open order.
- **Don't use it when:** A bespoke keydown listener for Escape. A Base UI popup — it owns its own open/close and Escape handling.
- **Anatomy:** A module-level stack of {id, close}; one shared window keydown listener closes only the top entry.
- **Variants & states:** active (registered while true), inactive (not registered)
- **Accessibility:** Escape is the standard dismiss key; only the topmost layer ever intercepts it.
- **Related:** useClickAway

## Seams

### ZoomProvider / useZoom

The app-scale seam: pointer→layout math divides by the host's zoom factor instead of hardcoding it.

- **Use it when:** A kit component converts viewport pointer coordinates into layout px (drag seams, sliders). A host whose zoom mechanism does NOT rescale pointer coordinates (a CSS-based body zoom) wraps the app in ZoomProvider with its factor.
- **Don't use it when:** The browser's native page zoom — it already reports pointer coordinates in layout px; the default factor 1 is correct, wrap nothing. Styling — zoom is a coordinate-space concern, never a size token.
- **Anatomy:** A React context defaulting to 1; ZoomProvider sets it, useZoom() reads it.
- **Variants & states:** default 1 (tests, unzoomed or page-zoomed hosts), provided factor (CSS-zoom hosts)
- **Accessibility:** None — an invisible coordinate seam.
- **Related:** StepSlider

## Surface

### Card

A raised content surface — the board sticker for framing a block of content.

- **Use it when:** Framing a self-contained block of content on the board (a form, a panel, a summary). A surface that should read as raised off the ground with the sticker chrome.
- **Don't use it when:** Floating chrome that dismisses (use MenuCard, PopoverCard, or ModalShell). A plain in-flow section that should sit flat on the ground with no shadow.
- **Anatomy:** One div: black edge border, hard offset shadow, dark ground, and a low-contrast grid fill.
- **Variants & states:** default (a static raised surface; the grid, border, and shadow are theme-owned).
- **Accessibility:** A presentational container; the caller supplies the landmark or heading semantics for its content.
- **Related:** ModalShell, MenuCard, PopoverCard
