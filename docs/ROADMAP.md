# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Deadline: **submission 2026-07-28**; check-in week of 7/12 or 7/19 (repo
> scaffolding must be visible).

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

## Known gaps (carry into the next branches)

- **Tournament reads are not membership-gated** (graded — backend-enforced authorization). Any signed-in
  user holding a tournament or match id can read its lobby, board, or match view, including the roster's
  emails. Pre-dates M4 (the lobby has always done this) and ids are UUIDv4, so nothing is enumerable —
  but the check is simply absent. Fix as one shared viewer-membership gate across lobby, board, and
  match rather than per-surface patches.
- **`Profile` has no display name**, so emails are the de-facto player label everywhere. Adding
  `displayName` (schema + backfill + label swap) would let the UI stop showing addresses at all.

---

_Last reviewed: 2026-07-16_
