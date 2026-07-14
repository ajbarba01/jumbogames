# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Deadline: **submission 2026-07-28**; check-in week of 7/12 or 7/19 (repo
> scaffolding must be visible).

## Build order

The cut line rule ([DESIGN.md](DESIGN.md) decision 5): shell + one minigame end-to-end before any
second game. Submittable at every checkpoint.

| #   | Milestone                                                              | Status  |
| --- | ---------------------------------------------------------------------- | ------- |
| 0   | Repo scaffolding — Next.js app, docs, templates, Playwright CI, README | done    |
| 1   | Supabase + Prisma wiring — auth, profiles, roles, owner allowlist      | pending |
| 2   | Owner user-management page (promote/demote admins)                     | pending |
| 3   | Tournament shell — tournaments, teams, join codes, match assignment    | pending |
| 4   | Minigame 1: trivia tug-of-war (incl. admin question-bank CRUD)         | pending |
| 5   | Rankings + per-player normalization                                    | pending |
| 6   | Admin spectate view                                                    | pending |
| 7   | Minigame 2: typing race                                                | pending |
| 8   | Minigame 3: word game                                                  | pending |
| 9   | Minigame 4: battleship                                                 | pending |

Milestones 7–9 are stretch relative to the graded criteria — everything graded is complete after 6.

---

_Last reviewed: 2026-07-14_
