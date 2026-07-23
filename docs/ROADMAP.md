# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Pace the work by what the milestone needs, not by a clock — quality is
> independent of scope ([AGENTS.md](../AGENTS.md)). Build the best version of each thing you touch.

## Build order

The cut line rule ([DESIGN.md](DESIGN.md) decision 5): shell + one minigame end-to-end before any
second game. Submittable at every checkpoint. Each minigame gets a short design session before its
build (per-game specifics are listed under Deferred design in DESIGN.md).

| #   | Milestone                                                                                                                                          | Status  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | Repo scaffolding — Next.js app, docs, templates, Playwright CI, deploy                                                                             | done    |
| 1   | Auth + roles — Supabase auth, profiles, owner allowlist, owner permissions page; auth E2E spec                                                     | done    |
| 2   | UI system — port console-kit (drop `chrome/`), retheme tokens, port UI.md, add `motion`                                                            | done    |
| 3   | Tournament shell — host/create, game code, lobby, teams, ready/start/lock; round-robin schedule + standings engine (pure, tested) + round board UI | done    |
| 4   | Match container — K-minigame reveal, zoom in/out, scoring screen, round + match lifecycle (pure) + Realtime channels + spectate                    | done    |
| 5   | Minigame 1: trivia tug-of-war + admin question-bank CRUD; CRUD E2E spec                                                                            | pending |
| 6   | Final standings + per-player normalization utilities                                                                                               | pending |
| 7   | Open hosting — player-creatable games, config (max teams, minigame pool, K), "game" copy sweep (DESIGN decisions 14–15)                            | pending |
| 8   | `displayName` (schema + backfill + label swap) + spectate-by-link (DESIGN decision 16)                                                             | pending |
| 9   | Team rooms + roster fluidity — Board/My team tabs, persistent team picker, join/leave/kick under the lock rule (DESIGN decision 17); E2E           | pending |
| 10  | Minigame 2: typing race                                                                                                                            | pending |
| 11  | Minigame 3: word game (territory capture)                                                                                                          | pending |
| 12  | Minigame 4: battleship                                                                                                                             | pending |
| 13  | Polish pass — reconnect UX, reduced-motion, projector-scale check on the round board                                                               | pending |

Everything graded is complete after 6; 7–13 are the full vision. The games-first milestones (7–9) sit
before the remaining minigames because minigames are swappable content behind a container the
refactor doesn't touch, while 7–9 change the container's doors — and hacknight resilience (anyone can
spin up a 2-team game as a fallback) needs the doors more than a third minigame. Milestone 2 sits
early because every later surface builds on the kit; its scope is capped at "kit ports + one theme
lands" — reference gathering and mockups happen inside it, not as a separate phase.

Milestone 4 is done: phases 1–3 (core + mockup, then the server backend — schema, realtime, routes,
playable match page), phase 4 (board auto-pull, spectate entry, byes, force-yield), and phase 5
(Playwright E2E) have all landed. Mid-tournament join and kick, originally scoped into phase 4, are
deferred post-MVP — neither is required by REQUIREMENTS.md, and phase 4 shipped a static roster per
match against the tournament's first playable minigame. The board's round-start button and
enter-match link are not temporary: phase 4 keeps both, and both play the wipe like everything phase 4
added. Browser back/forward is made safe rather than blocked: the lobby and board resync on history
restore (Next reuses a page's RSC payload on back/forward), and the match page self-heals on its
heartbeat. A live match guards tab close/reload.

The slam-wipe transition + loading system (`SlamWipe` in the kit, `src/components/wipe/` in the app)
shipped as foundational infrastructure ahead of Milestone 10's polish pass, so that milestone isn't
double-counted for it. It covers all in-app (client) navigations, the primary case; the cold-load /
first-paint cover is deferred — the provider is client-only, so a pre-hydration cover risks an SSR
flash and needs its own pass.

## Known gaps (carry into the next branches)

- **Game reads still show emails to any signed-in user.** The games-first design (DESIGN decision 16)
  makes open reads _intentional_ — spectate by link, play by code — so the old "lobby reads are open"
  gap stops being a gap to close and becomes a leak to fix: the leaked data is emails, and Milestone 8's
  `displayName` (schema + backfill + label swap) kills it. Until M8 lands, board/match views stay
  membership-gated as built; the gate relaxation ships with M8, not before.
- **Portaled overlays aren't inert'd by the wipe.** `WipeProvider`'s `inert` wrapper only covers the
  `{children}` subtree; `ModalShell`, `PopoverCard`, `Select`, `Tooltip`, and `FloatCard` all portal to
  `document.body`, outside it. A wipe fired while one is open leaves it focusable/clickable under the
  opaque panel, and the modal's own outside-hiding can silence the wipe's still-loading cue for screen
  readers. Must be solved before any navigation inside a modal opts into the wipe.
- **Production still has no playable minigame until M5.** `poolFor("production")` stays empty until a
  non-`devOnly` minigame lands. E2E no longer shares that limitation: `JUMBO_TEST_MINIGAME_POOL`, set
  only in `playwright.config.ts`, opts the spawned E2E server into the `stub` game, so round start,
  board auto-pull, spectate entry, byes, and the live-match `beforeunload` guard are all observable
  (see `e2e/round-start.spec.ts`). In production, `checkRoundDraw` now fails a round start closed
  (409, no mutation, the round stays `pending`) rather than committing a round with zero slots — the
  empty pool can no longer corrupt a round, only block starting one until M5 ships.
- **A round start's network wait is uncovered.** `BoardRoundStart` awaits the round-start POST before
  opening the wipe, so only the board swap plays covered. Awaiting inside `cover()` would be worse:
  React drops post-await updates out of the transition, so `isPending` — the machine's `committed`
  signal — falls before the refresh lands and the panel reveals early. Covering the wait needs a
  pending signal the machine can read that isn't the transition edge.

---

_Last reviewed: 2026-07-23_
