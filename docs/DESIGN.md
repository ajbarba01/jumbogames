# Design

> Authority for **product and project facts** — what the game is, the stack, why, and the durable
> decisions. The graded assignment lives verbatim in [REQUIREMENTS.md](REQUIREMENTS.md); build order and
> status live in [ROADMAP.md](ROADMAP.md). The original 1-page submitted design doc is
> [Design_Doc.txt](Design_Doc.txt) (historical artifact; this file supersedes it).

## The game

Team-based **games** of short **co-operative** minigames for JumboCode hacknights. Anyone can create
a game — pick the minigames, share one code — and teams of any size play a **round-robin** of short
1v1 matches; **scoring is normalized per-player**, so a 3-person team competes fairly against a
6-person team. A game with more teams _is_ a tournament: same engine, more rounds, a projected
standings board. Anyone signed in can spectate any game via its link; playing requires the code.

**Vocabulary:** the code entity is `Tournament` (schema, routes, types — kept to avoid churn); the
product word is **game**. UI copy says "tournament" only when describing an actual multi-team game
(decision 15).

## Game format: round-robin

Full rationale and the pure-engine contract live in the
[round-robin spec](superpowers/specs/2026-07-15-round-robin-tournament-format-design.md).

- **Everyone plays everyone once.** Pairings follow a fixed rotation (circle method) computed at start;
  the whole schedule is known up front because pairings don't depend on results. N-1 rounds for even N,
  N rounds for odd N. The 2-team case degenerates correctly — one round, one match — which is what
  makes a pickup game and a tournament the same entity (decision 14).
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

1. Land → login/signup (redirect if already authenticated). Home's hero is the code entry; **Create
   a game** sits beneath it as the secondary action.
2. Join: enter the game code.
3. Team picker: create a team (becoming its **leader**) or tap an existing team to join it. The
   picker is the game's permanent join screen — after start it stays open to un-teamed code-holders,
   showing each team's lock state (a team in a live match opens after its round).
4. Leaders ready up. When all are ready the creator's Start unlocks; on start, team **names and
   colors freeze** — membership stays fluid under the lock rule (decision 17).
5. In-game, players live in two tabs: **Board** (the shared standings + matchups surface, the same
   one projected) and **My team** (the team room: roster, leave, leader kick, next-match context).
   Un-teamed viewers get **Board** and **Join a team**.
6. Match: the 1v1 overview reveals the match's K minigames as previews in a row. Entering a minigame
   **zooms into its preview**; the minigame plays; a scoring screen follows; zoom out returns to the
   overview with the minigames won so far.
7. After the last minigame the match completes and players return to the board, where they can
   spectate any live match. All matches close → next round → repeat → final standings, stamped on
   the board (a 2-team game's standings are its result — there is no separate results screen).

## Creating a game

Any signed-in player can create a game: name it, pick the **minigame pool** (non-empty subset), set
**K** (`minigamesPerMatch`, 1–4, independent of pool size — the draw repeats kinds when the pool is
shorter than K) → land in the game with its code (for the projector or the table). Team count is not
a per-game config: any game may hold up to `MAX_TEAMS` (15, the kit's fixed color-palette ceiling), a
constant, not a host-set field — the earlier `maxTeams` (2–15) per-game config was cut before it was
built (decision 14). The creator holds the game's host
powers — Start when all leaders are ready (with an override to start anyway or remove a dead team) —
and may also join a team and play; hosting is a role on the game, not a seat. Spectators need no
code: any signed-in user can open a game's board by link and spectate any live match full-screen;
joining a team is what requires the code (link = read, code = write).

## Roles

`owner > admin > player`.

- **Owner** — bootstrapped via `OWNER_EMAILS` env allowlist at signup; has a permissions page to
  promote/demote **admins**. The allowlist only grants owner, never revokes it; removing an email
  from `OWNER_EMAILS` does not demote its existing owner row. Demoting an owner requires a direct
  database update.
- **Admin** — manages content: the trivia question bank (and future minigame content); also holds
  host powers over every game, admin/owner alike, as a rescue path for when its creator drops off
  mid-event (`isGameHost`, [ROADMAP.md](ROADMAP.md)).
- **Player** — signs up (email + password, confirmation off), joins with a game code, plays — and
  can create games (decision 14). Per-game host powers belong to the game's creator first, with the
  admin/owner rescue path above as the exception — not to a role in general.

## The minigames

All co-op: every player on a team acts; the server aggregates. Each game gets its own design session
before build (see [ROADMAP.md](ROADMAP.md)); the shapes below are the agreed baseline.

1. **Trivia tug-of-war** — both teams draw from the same seeded deck of admin-authored MC-4 questions
   (CRUD via admin UI, seedable from OpenTDB), in the same order, so neither team gets an easier
   sequence; each player free-paces their own stream of cards from their team's shared deck rather
   than waiting on a shared clock, and a team never repeats a card until every member has personally
   exhausted the deck. A correct answer is worth +3, a wrong one −1, so blind guessing nets zero
   expected value and doesn't pay. Every answer also pulls a rope: a decaying-impulse model where
   each pull scales down with team size (so a bigger team's individual answers move it less, keeping
   totals comparable) and idle time relaxes the rope back toward center on a 10-second half-life, so
   a losing team is never locked out of a comeback. Pinning the rope at either wall ends the match
   immediately and wins it outright, overriding the normalized-score comparison; if neither side pins,
   the 120-second timer ends the match and the higher normalized mean wins. There is no skip — every
   question must be answered to advance.
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
   **Exception, deliberate (Slice 4, 2026-07-25):** trivia's `redact` ships a per-viewer
   `lastAnswer: { deckIndex; correctIndex } | null` so the client can hold a reveal beat (lit correct
   choice, shake on a wrong pick) before the next card replaces it. This does not open the hole the
   invariant guards against: `lastAnswer` is derived from `player.seen.at(-1)`, so its `correctIndex`
   only ever names a card the viewer has already answered — the viewer's live, unanswered hand
   (`player.current`) never gains a `correctIndex` on the wire. `TriviaState` and `apply` are
   untouched; only `redact`'s output shape grew. Full rationale in
   `superpowers/specs/2026-07-25-slice4-trivia-reskin-design.md` (D2, local artifact).
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
7. **One game code, self-organizing teams.** Team creator is leader; leaders ready up; the creator
   starts (with override). Start freezes team names/colors; membership stays fluid under decision 17,
   and the team picker remains the join surface for un-teamed code-holders after start.
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
14. **Games-first, no format enum: a tournament is a game with more teams.** Anyone signed in creates
    a game, configuring the minigame pool (non-empty subset) and K (1–4, independent of pool size —
    `drawRoundGames` repeats kinds when the pool is shorter than K; amended from the original "K ≤
    pool size" cap by the 2026-07-24 create-game slice spec); a pickup game is just a 2-team one — no
    format field distinguishes it. A per-game `maxTeams` (2–15) was planned alongside the pool column
    but cut before the 2026-07-24 create-game slice built it: team count is capped only by the fixed
    `MAX_TEAMS` (15) palette ceiling, the same for every game, not a host-set config value. Differences
    that remain are **config values, never branches** — the
    engine (rounds, matches, slots, scoring) has zero format awareness, and every game runs the same
    start → board → start-round flow. A true data-model inversion (Game as root, Tournament as
    wrapper) was evaluated and rejected: its real cost is `Team` scoping (polymorphic parents or
    durable global teams), and it adds no capability doors-on-the-existing-engine don't. Tripwire:
    if format-shaped conditionals ever creep into the engine, revisit. This also supersedes
    admin-only hosting; admins keep content management (see Roles). Full rationale in the
    [games-first spec](superpowers/specs/2026-07-23-games-first-refactor-design.md) (local artifact).
15. **Vocabulary mapping: code `Tournament` = product "game".** The schema, routes, and types keep
    `Tournament` to avoid rename churn; UI copy says "tournament" only when describing an actual
    multi-team game. **Amended in Slice 3 (2026-07-25):** the product word flipped back from "event"
    to "game" — the mockup, the handoff spec, `/create`, and everyone talking about the project all
    said "game", and "game"/"minigame" coexist readably in context (the original overload concern
    that drove the "event" switch didn't hold up in practice). Home's two "event" strings were swept
    with the rest of the game-page surface in the same slice. Recorded so the drift is a deliberate
    translation, not an accident; a future code rename stays open.
16. **Spectate by link, play by code.** Board and match-spectate reads are open to any signed-in
    user (no membership required); mutations that join a game — picking a team — require the game
    code, validated server-side in the join request. Link = read, code = write. Anonymous (no-auth)
    spectating is a deliberate post-MVP loosening, gated on `displayName` fully replacing emails.
    `displayName` is a real, `NOT NULL`, required-at-signup, user-editable field (backfilled from the
    email local part for existing rows, changed via `PATCH /api/profile`, edited in place on the home
    identity card), and every other-player-facing label (lobby roster, presence, match member labels)
    renders it instead of email. Home self-identity ("Signed in as {email}") and the admin permissions
    page deliberately still show email — both are the account owner looking at their own or another
    admin's account, not a player-facing label, so the leak this decision is about doesn't apply
    there. The read-opening itself has now shipped (Slice 3): `resolveViewer` no longer refuses any
    signed-in viewer, and `canSpectate` was deleted rather than rehomed — once reads opened, its only
    honest value was `true`. The game code became a withheld credential instead, via `holdsGameCode`
    (`src/lib/tournament/viewer.ts`), consumed by both the game page and the tournament read route.
    The code is also stripped from the address bar (`history.replaceState`, client-side) once the
    server has admitted a `?c=` link: the server reads it on the initial request and never needs it
    again, so leaving it visible would only turn the natural "come spectate, here's the link" gesture
    into handing over the write credential — the exact failure this decision exists to prevent.
    The accepted consequence: a link-borne viewer who has **not yet joined a team** is demoted on
    reload, because nothing persists that grant once the URL stops carrying it — they need the link
    again. Every other viewer class is unaffected, since a member's, host's or admin's grant is
    derived from the roster and is reconstructed on every render.
17. **Roster fluidity under the lock rule.** Join, leave, and leader-kick are allowed only while the
    team has no live match (lobby phase or between rounds); slot roster snapshots already make the
    boundary safe. Leader leaving auto-transfers leadership to the earliest-joined member; an empty
    team stays in the schedule and forfeits. Team size stays score-neutral by per-player
    normalization; kick is the answer to sandbagging. **Landed in Slice 3:** the lock rule is
    `isTeamLocked` (pure, `src/lib/tournament/roster-lock.ts`), enforced on writes by
    `requireRosterOpen` (`src/lib/tournament/access.ts`); forfeit is derived from an empty roster and
    is never stored — there is no forfeit column or migration. An emptied team survives after start
    because the round schedule holds foreign keys to it, so it stays in standings, marked, scores
    frozen. A kicked player returns to the team picker and may pick another team under the same lock
    rule. Creating a team also now requires the game code, closing a hole where create-team was an
    unguarded way to join a game without one.

18. **Minigame zoom is full-viewport, uniform across every slot phase.** `PlayFrame` renders gate,
    countdown, playing and scoring full-bleed, rather than only while playing — nothing resizes
    mid-slot, and the `layoutId` shared element animates the overview card straight to the edges
    instead of animating into a frame that would then have to un-frame itself. The panel drops its
    board-sticker chrome with its size cap: a full-bleed surface is in-flow content, which owns the
    darkest ground (`s1`), rather than something that floats and casts a hard shadow (docs/UI.md's
    outline vocabulary is for surfaces that float). Landed in Slice 4 (2026-07-25) alongside the
    trivia reskin, though the change reaches every minigame surface, not just trivia's. Accepted cost:
    `GatePanel`, `CountdownOverlay`, `ScoringScreen` and the stub surface all inherit the larger stage
    and read sparse in it until a later pass designs for the room — that pass is follow-up work, not
    part of Slice 4.

19. **The admin question bank filters by difficulty server-side.** The list route takes difficulty as
    an optional enum query param and filters in the query, so paging and the total count describe the
    filtered set rather than a page the client then thins out — a bank that grows past one page would
    otherwise show a filter that appears to lose questions. "Any difficulty" is a client-side
    sentinel: it is the picker's default and is never sent, so an absent param means unfiltered on
    both sides. Landed in Slice 5 (2026-07-26) as a deliberate, pre-approved exception to that
    slice's otherwise reskin-only rule — the mockup drew the control, and shipping it as decoration
    or as a client-side filter would both have been worse than widening the route.

20. **The page ground darkened one step, and that step is the last one available.** `--color-s1` moved
    from `#18110b` to `#150e08` so the background doodle layer — now boiling, coloured, and at 4.5×
    its authored opacity — sits on a deeper ground. Contrast was never the constraint: darkening the
    ground raises every text ratio (s7 3.99 → 4.09, s11 12.79 → 13.09). The binding constraint is the
    scale's even-ramp rule, which the palette test enforces: the grounds band s1–s6 must step by
    0.03–0.065 in OKLCH lightness, and s1 now sits 0.062 below s2. A darker ground than this is not a
    one-token edit — it requires re-spacing s2–s6 as a set, which moves every card and surface ground
    in the app, and is a theme pass rather than a tweak. The tuning surface on `/showcase` still
    previews the darker stops, labelled as needing that re-space, so the option stays visible without
    being reachable by accident. The doodle layer also adopts the 15-colour team palette as its widest
    mix, a documented exception to the team-colour rule (see UI.md) rather than a new palette.

## Deferred design (grill before building each)

- Per-game specifics: typing passage source, word-game grid size and word validation dictionary,
  battleship fleet/volley numbers and turn cadence.
- The exact per-player normalization formula per game.
- Reconnect UX polish (server-authoritative state makes resume-on-rejoin near-free; the polish is
  client-side).
- Post-MVP follow-ups named by the games-first design: bring-my-team (clone a formed team into a new
  game), anonymous spectating, a leader join-approval toggle, invite links.

---

_Last reviewed: 2026-07-26_
