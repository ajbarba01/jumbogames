# Design

> Authority for **product and project facts** — what the game is, the stack, why, and the durable
> decisions. The graded assignment lives verbatim in [REQUIREMENTS.md](REQUIREMENTS.md); build order and
> status live in [ROADMAP.md](ROADMAP.md). The original 1-page submitted design doc is
> [Design_Doc.txt](Design_Doc.txt) (historical artifact; this file supersedes it).

## The game

A team-based tournament of short **co-operative** minigames for JumboCode hacknights. Teams of any
size play a **round-robin** of short 1v1 matches; **scoring is normalized per-player**, so a 3-person
team competes fairly against a 6-person team. Admins run the tournament and project any live match.

## Tournament format: round-robin

Full rationale and the pure-engine contract live in the
[round-robin spec](superpowers/specs/2026-07-15-round-robin-tournament-format-design.md).

- **Everyone plays everyone once.** Pairings follow a fixed rotation (circle method) computed at start;
  the whole schedule is known up front because pairings don't depend on results. N-1 rounds for even N,
  N rounds for odd N.
- **Odd team counts** give each team exactly one **bye** across the schedule (worth a match's minigames);
  even counts need none. A bye's credit lands on **minigames won only, never the normalized tiebreak** —
  a team that sat out has not earned a score to break ties with — and is applied when the bye's round
  completes, not when it starts. Accepted limitation: ending the tournament while a bye's round is
  still active drops that bye's credit, since standings only count byes from rounds recorded
  `complete`.
- **A match is K minigames**, K = `minigamesPerMatch` (per-tournament config, 1–4, default 1), drawn
  distinct from the pool. A minigame is won by the higher **normalized team score**; the winner scores
  one point. There is **no match winner** — points are counted per minigame.
- **Ranking = total minigames won**, tiebroken by **cumulative normalized score**. Final standings are
  the ranking after the last round — no separate placement phase.
- Teams whose match finishes early **spectate** any still-running match until the round closes.

## Player flow

1. Land → login/signup (redirect if already authenticated).
2. Join screen: enter the game code (players never host).
3. Lobby: create a team (becoming its **leader**) or tap an existing team to join it.
4. Leaders ready up. When all are ready the host's Start unlocks; on start, the game code stops
   admitting players and teams freeze.
5. Round board: the ranked **standings** table (the hero) plus this round's live matchups.
6. Match: the 1v1 overview reveals the match's K minigames as previews in a row. Entering a minigame
   **zooms into its preview**; the minigame plays; a scoring screen follows; zoom out returns to the
   overview with the minigames won so far.
7. After the last minigame the match completes and players return to the round board, where they can
   spectate any live match — the same surface the host projects.
8. All matches close → next round → repeat → final standings.

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
| **`motion` (ex-framer-motion)**           | Game-layer animation: shared-element zoom into minigames (`layoutId`), slot machine, round transitions. Reuse over rebuild.   |

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
6. **Round-robin over bracket/Swiss/elimination.** Every team plays every other once, so final ranking
   reflects aggregate performance against the whole field rather than pairing luck or first-loss
   position. The cost is a round count that scales with N; accepted for the fairness. Supersedes the
   earlier bracket and Swiss drafts — see the
   [round-robin spec](superpowers/specs/2026-07-15-round-robin-tournament-format-design.md).
7. **One game code, self-organizing teams.** Team creator is leader; leaders ready up; the host
   starts (with override) and the tournament locks.
8. **Match = K configurable minigames, scored per minigame.** `minigamesPerMatch` (1–4, default 1) sets
   how many distinct pool games a match plays; ranking counts minigames won, so a match needs no winner
   and even K may split. Tiebreak is cumulative normalized score.
9. **Port console-kit rather than adopt shadcn or hand-roll.** The kit is proven, retheme-by-design,
   and already encodes the interaction quality bar; see UI system above.
10. **The UI kit is an npm workspace package (`packages/ui`, `@jumbo/ui`).** Portability is a design
    constraint: the kit lifts into a future repo by copying one directory. The app consumes
    TypeScript source via `transpilePackages`; a theme remains one CSS file.
11. **Palette re-graded to Direction B ("bolder toasted").** The 12-step scale now sits on an even
    OKLCH lightness ramp at a locked hue of 68°, with deeper, warmer grounds than the original
    port — fixing an uneven ramp, hue drift, and two failing WCAG contrast steps. Status hues
    (`run`, `warn`, `ok`, `crit`) were retuned to remove halation on near-black while keeping their
    meanings and the yellow/pink accent identity. A purpose-built 15-team categorical palette
    (`--color-team-1`…`--color-team-15`) was added with a fixed assignment order (never cycled),
    since team-identity color didn't exist before and colorblind-safe qualitative palettes top out
    well below 15 — team color is decorative identity paired with the team name, never part of the
    status vocabulary. The `sand-dark` theme was removed, collapsing the kit to one shipped theme
    (Toasted Arcade) as the single source of truth. Every value is guarded by
    `packages/ui/src/themes/palette.test.ts`, which re-derives the OKLCH/WCAG/ΔE checks through the
    pure `packages/ui/src/themes/color-math.ts` so the grading can't rot. See
    [the palette professionalization spec](superpowers/specs/2026-07-14-palette-professionalization-design.md)
    for the full rationale and rejected alternates.
12. **Match slots (M4).** A `Round` gains `state` (pending→active→complete) and an ordered
    `drawnGames` array; the round's start persists the seeded draw. Each non-bye `Match` owns K
    `MinigameSlot` rows (ordinal, kind, phase, ready set, both roster snapshots frozen at countdown,
    deadline, per-team normalized scores + winner, and a JSON `payload` for the game's authoritative
    working state). Match and round state derive from slots — no stored match phase. `Match.version`
    is an optimistic-concurrency token for slot writes.
13. **Placement is resolved entirely server-side, never inferred by the client.** A viewer is navigated
    only to the placement the server computes for them: their own live match, the board on an active bye,
    or nowhere. Someone with neither — a host not playing, an admin, anyone watching a match they aren't
    rostered on — is never moved, so opening a match to spectate is never undone by another team's round
    starting.

## Deferred design (grill before building each)

- Per-game specifics: trivia timing/rope math, typing passage source, word-game grid size and
  word validation dictionary, battleship fleet/volley numbers and turn cadence.
- The exact per-player normalization formula per game.
- Reconnect UX polish (server-authoritative state makes resume-on-rejoin near-free; the polish is
  client-side).

---

_Last reviewed: 2026-07-22_
