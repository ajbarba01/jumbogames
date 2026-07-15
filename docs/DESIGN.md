# Design

> Authority for **product and project facts** — what the game is, the stack, why, and the durable
> decisions. The graded assignment lives verbatim in [REQUIREMENTS.md](REQUIREMENTS.md); build order and
> status live in [ROADMAP.md](ROADMAP.md). The original 1-page submitted design doc is
> [Design_Doc.txt](Design_Doc.txt) (historical artifact; this file supersedes it).

## The game

A team-based tournament of short **co-operative** minigames for JumboCode hacknights. Teams of any
size compete in 1v1 best-of-3 matches; **scoring is normalized per-player**, so a 3-person team
competes fairly against a 6-person team. Admins run the tournament and project any live match.

## Tournament format: classification bracket

- **Everyone plays every round.** N teams play ⌈log₂N⌉ rounds. Losers drop into parallel placement
  brackets (winners' side plays for 1st–4th, losers' side for 5th–8th, and so on), so the final
  standing of **every** team is decided structurally by its bracket path — no cross-match counting.
- Non-power-of-2 team counts pad round 1 with **byes** (a bye is an auto-win; assignment random).
- **A match always plays all 3 minigames**, drawn distinct from the pool. Minigame winner = higher
  normalized team score. Match winner = most minigames won. Cumulative normalized score is
  stats/flavor only — ranking never depends on it.
- Teams whose match finishes early **spectate** any still-running match until the round closes.

## Player flow

1. Land → login/signup (redirect if already authenticated).
2. Join screen: enter the game code (players never host).
3. Lobby: create a team (becoming its **leader**) or tap an existing team to join it.
4. Leaders ready up. When all are ready the host's Start unlocks; on start, the game code stops
   admitting players and teams freeze.
5. Round board (bracket tree): shows this round's matchups, live status, and standings.
6. Match: the 1v1 overview opens with a **slot-machine reveal** of the 3 chosen minigames, shown as
   three previews in a row. Entering a minigame **zooms into its preview**; the minigame plays; a
   scoring screen follows; zoom out returns to the overview with match status (games won so far).
7. After game 3 the match completes and players return to the round board, where they can spectate
   any live match — the same surface the host projects.
8. All matches close → next round pairings → repeat → final standings.

## Host flow

Admins and the owner see a **Host** button: create a tournament → lobby view with the game code (for
the projector) → Start when all leaders are ready (with an override to start anyway or remove a dead
team) → the round board doubles as the projector surface; clicking any live match spectates it
full-screen. A host may also join a team and play; hosting is a role on the tournament, not a seat.

## Roles

`owner > admin > player`.

- **Owner** — bootstrapped via `OWNER_EMAILS` env allowlist at signup; has a permissions page to
  promote/demote **admins**. The allowlist only grants owner, never revokes it; removing an email
  from `OWNER_EMAILS` does not demote its existing owner row. Demoting an owner requires a direct
  database update.
- **Admin** — hosts tournaments, manages the trivia question bank, projects matches.
- **Player** — signs up (email + password, confirmation off), joins with a game code, plays.

## The minigames

All co-op: every player on a team acts; the server aggregates. Each game gets its own design session
before build (see [ROADMAP.md](ROADMAP.md)); the shapes below are the agreed baseline.

1. **Trivia tug-of-war** — both teams answer the same questions; the rope moves by fraction correct
   and speed. Questions are **admin-authored content** (CRUD via admin UI), not hardcoded.
2. **Typing race** — same passage for all; team progress is the normalized aggregate of individual
   typing.
3. **Word game (territory capture)** — one shared letter grid; players drag across adjacent letters
   to form words, claiming those tiles for their team. Claimed tiles can only be reclaimed by a
   longer word that runs through at least one of them. Most tiles at timeout wins.
4. **Battleship** — one shared board per team; each player owns ships and aims their own shots.
   Balance baseline: **fixed fleet and volley size per match**, distributed across each team's
   players (a 3-player team owns 2 ships each and fires twice per volley against a 6-player team),
   keeping both sides symmetric. Exact numbers land in its design session.

## Stack & rationale

| Choice                                    | Why                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Next.js (App Router) + TS + Tailwind**  | Required frontend stack; route handlers cover the backend — each operation is a stateless request, no separate server needed. |
| **Vercel**                                | Required deployment platform; first-class Next.js support.                                                                    |
| **Supabase (Postgres + Auth + Realtime)** | One service covers persistence, authentication, and live sync. Auth directly satisfies the security criteria.                 |
| **Prisma**                                | Readable schema format — this repo doubles as a reference for beginner devs on my JumboCode team.                             |
| **Zod**                                   | Runtime validation of every request body at the route boundary (graded: backend input validation).                            |
| **Playwright + GitHub Actions**           | Required E2E testing (auth + CRUD flows) on every push/PR.                                                                    |
| **`motion` (ex-framer-motion)**           | Game-layer animation: shared-element zoom into minigames (`layoutId`), slot machine, bracket transitions. Reuse over rebuild. |

## UI system: ported console-kit

The UI is the coa **console-kit** ported into `packages/ui` (`@jumbo/ui`, React 19 + Base UI +
Tailwind v4 tokens) under a **full retheme** — the **Toasted Arcade** register: a warm near-black
scale, cream ink, yellow/pink accents, sticker chrome (thick edge borders + hard offset shadows),
and a hand-drawn doodle background layer. The kit's design laws (elevation grounds, status
vocabulary, focus ring, escape-stack dismissal, every-state-ships, no raw values) live in
`docs/UI.md`; the Electron `chrome/` directory was dropped, and the console-era status members
(StatusDot, Meter) were cut with the register shift. A theme is one CSS file — Toasted Arcade is the
single shipped theme. Rationale: dialogs, toasts, tooltips, menus, and focus/dismissal behavior
arrive already solved; a theme is a token-scale swap by design.

## Decisions (durable WHYs)

1. **Server-authoritative games; Realtime is read-side transport only.** All game mutations go through
   route handlers (Zod-validated, role/membership-checked); clients subscribe to Supabase Realtime
   for state fan-out but never write game state. Hidden information (battleship placements) never
   reaches the wrong client. Spectating is subscribing to the same channel read-only.
2. **Authorization is enforced in route handlers, not RLS.** Prisma connects as the database owner
   and bypasses RLS, so RLS cannot be the enforcement layer.
3. **Owner via env allowlist + in-app admin promotion.** No manual DB pokes, no bootstrap
   chicken-and-egg.
4. **Dedicated test Supabase project** (`jumbogames-test`) as the Playwright/CI target — real
   Supabase branching is paid; a separate project satisfies "database branch for testing" in spirit.
5. **Build the tournament shell + ONE minigame end-to-end before starting the next game.** Minigames
   are swappable content behind a uniform match container. Order: trivia → typing race → word game →
   battleship. Submittable at every point after the first game lands.
6. **Classification bracket over Swiss/round-robin/elimination.** Everyone plays all ⌈log₂N⌉ rounds,
   the final ranking is exact and structural, and the centerpiece screen is a real bracket tree.
7. **One game code, self-organizing teams.** Team creator is leader; leaders ready up; the host
   starts (with override) and the tournament locks.
8. **Always play all 3 minigames per match.** Uniform pacing, no dead preview slot, everyone plays
   everything.
9. **Port console-kit rather than adopt shadcn or hand-roll.** The kit is proven, retheme-by-design,
   and already encodes the interaction quality bar; see UI system above.
10. **The UI kit is an npm workspace package (`packages/ui`, `@jumbo/ui`).** Portability is a design
    constraint: the kit lifts into a future repo by copying one directory. The app consumes
    TypeScript source via `transpilePackages`; a theme remains one CSS file.

## Deferred design (grill before building each)

- Per-game specifics: trivia timing/rope math, typing passage source, word-game grid size and
  word validation dictionary, battleship fleet/volley numbers and turn cadence.
- The exact per-player normalization formula per game.
- Reconnect UX polish (server-authoritative state makes resume-on-rejoin near-free; the polish is
  client-side).

---

_Last reviewed: 2026-07-14_
