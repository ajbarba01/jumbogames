# Design

> Authority for **product and project facts** — what the game is, the stack, why, and the durable
> decisions. The graded assignment lives verbatim in [REQUIREMENTS.md](REQUIREMENTS.md); build order and
> status live in [ROADMAP.md](ROADMAP.md). The original 1-page submitted design doc is
> [Design_Doc.txt](Design_Doc.txt) (historical artifact; this file supersedes it).

## The game

A team-based tournament of short **co-operative** minigames for JumboCode hacknights.

- An **admin** creates a tournament; players sign up and join a team with a **short join code**.
- Teams compete in **1v1 best-of-3 matches** of minigames drawn randomly from a pool.
- **Scoring is normalized per-player**, so a 3-person team competes fairly against a 6-person team.
- All teams play to the end and receive a **final ranking** (used for JumboCode point awards).
- Admins can **spectate any live match** (for the projector).

Minigame pool (v1): **trivia tug-of-war**, **typing race**, **word game**, **battleship**. All co-op;
more planned post-v1.

## Roles

`owner > admin > player`.

- **Owner** — bootstrapped via `OWNER_EMAILS` env allowlist at signup. Has a simple user-management
  page to promote/demote **admins**. (This page is also a graded showcase: auth-dependent feature,
  backend-enforced authorization, CRUD on a core model.)
- **Admin** — creates/runs tournaments, manages the trivia question bank, spectates matches.
- **Player** — signs up (email + password, email confirmation off), joins a team, plays.

## Stack & rationale

| Choice                                    | Why                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Next.js (App Router) + TS + Tailwind**  | Required frontend stack; route handlers cover the backend — each operation is a stateless request, no separate server needed. |
| **Vercel**                                | Required deployment platform; first-class Next.js support.                                                                    |
| **Supabase (Postgres + Auth + Realtime)** | One service covers persistence, authentication, and live sync. Auth directly satisfies the security criteria.                 |
| **Prisma**                                | Readable schema format — this repo doubles as a reference for beginner devs on my JumboCode team.                             |
| **Zod**                                   | Runtime validation of every request body at the route boundary (graded: backend input validation).                            |
| **Playwright + GitHub Actions**           | Required E2E testing (auth + CRUD flows) on every push/PR.                                                                    |

## Decisions (durable WHYs)

1. **Server-authoritative games; Realtime is read-side transport only.** All game mutations go through
   route handlers (Zod-validated, role/membership-checked); clients subscribe to Supabase Realtime for
   state fan-out but never write game state. Hidden information (e.g. battleship placements) never
   reaches the wrong client. This is what satisfies "backend-enforced authorization" for gameplay.
2. **Authorization is enforced in route handlers, not RLS.** Prisma connects as the database owner and
   bypasses RLS, so RLS cannot be the enforcement layer. Every handler authenticates the Supabase
   session and checks role/team membership before acting.
3. **Owner via env allowlist + in-app admin promotion.** No manual DB pokes; no admin-bootstrap UI
   chicken-and-egg.
4. **Dedicated test Supabase project** (second free-tier project) as the Playwright/CI target — real
   Supabase branching is paid; a separate project satisfies "database branch for testing" in spirit.
5. **Build the tournament shell + ONE minigame end-to-end before starting the next game.** The shell
   (auth, teams, matches, rankings, spectate) is the graded substance; minigames are swappable content.
   Game order by realtime complexity: trivia tug-of-war → typing race → word game → battleship. The
   project is submittable at every point after the first game lands.
6. **Trivia questions are admin-authored content** (CRUD via admin UI), not hardcoded — doubles as a
   clean graded CRUD surface.

## Deferred design (grill before building)

- Per-game co-op mechanics (how N players share one game instance per side).
- The exact per-player normalization formula.
- Match scheduling/bracket mechanics (round-robin vs Swiss vs bracket) for full ranking.

---

_Last reviewed: 2026-07-14_
