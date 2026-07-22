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
The board's round-start button and enter-match link are temporary bridges phase 4 replaces; both now
play the wipe, which their replacements should carry over. Browser back/forward is made safe rather
than blocked: the lobby and board resync on history restore (Next reuses a page's RSC payload on
back/forward), and the match page self-heals on its heartbeat. A live match guards tab close/reload.

The slam-wipe transition + loading system (`SlamWipe` in the kit, `src/components/wipe/` in the app)
shipped as foundational infrastructure ahead of Milestone 10's polish pass, so that milestone isn't
double-counted for it. It covers all in-app (client) navigations, the primary case; the cold-load /
first-paint cover is deferred — the provider is client-only, so a pre-hydration cover risks an SSR
flash and needs its own pass.

## Known gaps (carry into the next branches)

- **Lobby-phase tournament reads are open to any signed-in user.** Board and every match view are now
  membership-gated (host + roster + admin/owner; a non-member gets 404), but the **lobby** stays open
  while the tournament is joinable — join-by-code persists no row, so the server cannot tell a
  legitimate code-joiner from any other signed-in user until they pick a team. A signed-in id-holder
  can therefore still read a lobby-phase roster's emails until it starts. Bounded (non-enumerable
  UUIDv4 id; the lobby is the surface designed to be openly joinable). Closing it fully needs
  persisted lobby participation — pairs with the `displayName` schema work below.
- **`Profile` has no display name**, so emails are the de-facto player label everywhere. Adding
  `displayName` (schema + backfill + label swap) would let the UI stop showing addresses at all.
- **Portaled overlays aren't inert'd by the wipe.** `WipeProvider`'s `inert` wrapper only covers the
  `{children}` subtree; `ModalShell`, `PopoverCard`, `Select`, `Tooltip`, and `FloatCard` all portal to
  `document.body`, outside it. A wipe fired while one is open leaves it focusable/clickable under the
  opaque panel, and the modal's own outside-hiding can silence the wipe's still-loading cue for screen
  readers. Must be solved before any navigation inside a modal opts into the wipe.
- **A round start's network wait is uncovered.** `BoardRoundStart` awaits the round-start POST before
  opening the wipe, so only the board swap plays covered. Awaiting inside `cover()` would be worse:
  React drops post-await updates out of the transition, so `isPending` — the machine's `committed`
  signal — falls before the refresh lands and the panel reveals early. Covering the wait needs a
  pending signal the machine can read that isn't the transition edge.

---

_Last reviewed: 2026-07-22_
