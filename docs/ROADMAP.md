# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Pace the work by what the milestone needs, not by a clock — quality is
> independent of scope ([AGENTS.md](../AGENTS.md)). Build the best version of each thing you touch.

## Build order

The cut line rule ([DESIGN.md](DESIGN.md) decision 5): shell + one minigame end-to-end before any
second game. Submittable at every checkpoint. Each minigame gets a short design session before its
build (per-game specifics are listed under Deferred design in DESIGN.md).

| #   | Milestone                                                                                                                                          | Status          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 0   | Repo scaffolding — Next.js app, docs, templates, Playwright CI, deploy                                                                             | done            |
| 1   | Auth + roles — Supabase auth, profiles, owner allowlist, owner permissions page; auth E2E spec                                                     | done            |
| 2   | UI system — port console-kit (drop `chrome/`), retheme tokens, port UI.md, add `motion`                                                            | done            |
| 3   | Tournament shell — host/create, game code, lobby, teams, ready/start/lock; round-robin schedule + standings engine (pure, tested) + round board UI | done            |
| 4   | Match container — K-minigame reveal, zoom in/out, scoring screen, round + match lifecycle (pure) + Realtime channels + spectate                    | phases 1–3 done |
| 5   | Minigame 1: trivia tug-of-war + admin question-bank CRUD; CRUD E2E spec                                                                            | pending         |
| 6   | Final standings + per-player normalization utilities                                                                                               | pending         |
| 7   | Minigame 2: typing race                                                                                                                            | pending         |
| 8   | Minigame 3: word game (territory capture)                                                                                                          | pending         |
| 9   | Minigame 4: battleship                                                                                                                             | pending         |
| 10  | Polish pass — reconnect UX, reduced-motion, projector-scale check on the round board                                                               | pending         |

Everything graded is complete after 6; 7–10 are the full vision. Milestone 2 sits early because every
later surface builds on the kit; its scope is capped at "kit ports + one theme lands" — reference
gathering and mockups happen inside it, not as a separate phase.

Milestone 4 lands in phases: 1–3 (core + mockup, then the server backend — schema, realtime, routes,
playable match page) are in. Phase 4 (board auto-pull + spectate entry, byes, force-yield,
mid-tournament join/kick) and phase 5 (Playwright E2E), plus the full M4 doc reconciliation, remain.
The board's round-start button and enter-match link are temporary bridges phase 4 replaces.

The slam-wipe transition + loading system (`SlamWipe` in the kit, `src/components/wipe/` in the app)
shipped as foundational infrastructure ahead of Milestone 10's polish pass, so that milestone isn't
double-counted for it. It covers all in-app (client) navigations, the primary case; the cold-load /
first-paint cover is deferred — the provider is client-only, so a pre-hydration cover risks an SSR
flash and needs its own pass.

## Known gaps (carry into the next branches)

- **Tournament reads are not membership-gated** (graded — backend-enforced authorization). Any signed-in
  user holding a tournament or match id can read its lobby, board, or match view, including the roster's
  emails. Pre-dates M4 (the lobby has always done this) and ids are UUIDv4, so nothing is enumerable —
  but the check is simply absent. Fix as one shared viewer-membership gate across lobby, board, and
  match rather than per-surface patches.
- **`Profile` has no display name**, so emails are the de-facto player label everywhere. Adding
  `displayName` (schema + backfill + label swap) would let the UI stop showing addresses at all.
- **The wipe has no force-reveal ceiling.** If `router.push` targets a route that stalls or errors,
  `isPending` never falls, so `committed` never dispatches and the user stays covered indefinitely with
  only the still-loading cue. Spec-conformant — the machine only raises `showCue` at `maxElapsed` and has
  no timeout escape — but a real trap with no upper bound; give it one.
- **Portaled overlays aren't inert'd by the wipe.** `WipeProvider`'s `inert` wrapper only covers the
  `{children}` subtree; `ModalShell`, `PopoverCard`, `Select`, `Tooltip`, and `FloatCard` all portal to
  `document.body`, outside it. A wipe fired while one is open leaves it focusable/clickable under the
  opaque panel, and the modal's own outside-hiding can silence the wipe's still-loading cue for screen
  readers. Must be solved before any navigation inside a modal opts into the wipe.
- **Round-to-round transitions and match entry don't wipe yet.** The lobby → round board start beat
  covers the wipe's generalized `cover()`; the board's round-start button (`BoardRoundStart`) and
  `EnterMatchLink` are still the temporary phase-3 bridges and neither opts into the wipe. Phase 4 owns
  both.

---

_Last reviewed: 2026-07-16_
