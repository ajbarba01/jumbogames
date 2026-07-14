# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Deadline: **submission 2026-07-28**; check-in week of 7/12 or 7/19 (repo
> scaffolding must be visible).

## Build order

The cut line rule ([DESIGN.md](DESIGN.md) decision 5): shell + one minigame end-to-end before any
second game. Submittable at every checkpoint. Each minigame gets a short design session before its
build (per-game specifics are listed under Deferred design in DESIGN.md).

| #   | Milestone                                                                                                                                         | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | Repo scaffolding — Next.js app, docs, templates, Playwright CI, deploy                                                                            | done    |
| 1   | Auth + roles — Supabase auth, profiles, owner allowlist, owner permissions page; auth E2E spec                                                    | done    |
| 2   | UI system — port console-kit (drop `chrome/`), retheme tokens, port UI.md, add `motion`                                                           | pending |
| 3   | Tournament shell — host/create, game code, lobby, teams, ready/start/lock; classification bracket engine (pure, tested) + round board UI          | pending |
| 4   | Match container — slot-machine reveal, 3-preview overview, zoom in/out, scoring screen, match state machine (pure) + Realtime channels + spectate | pending |
| 5   | Minigame 1: trivia tug-of-war + admin question-bank CRUD; CRUD E2E spec                                                                           | pending |
| 6   | Final standings + per-player normalization utilities                                                                                              | pending |
| 7   | Minigame 2: typing race                                                                                                                           | pending |
| 8   | Minigame 3: word game (territory capture)                                                                                                         | pending |
| 9   | Minigame 4: battleship                                                                                                                            | pending |
| 10  | Polish pass — reconnect UX, reduced-motion, projector-scale check on the round board                                                              | pending |

Everything graded is complete after 6; 7–10 are the full vision. Milestone 2 sits early because every
later surface builds on the kit; its scope is capped at "kit ports + one theme lands" — reference
gathering and mockups happen inside it, not as a separate phase.

---

_Last reviewed: 2026-07-14_
