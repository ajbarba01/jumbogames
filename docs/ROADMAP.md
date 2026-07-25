# Roadmap

> Authority for **build order and status**. Single source for "what's next" — update in the same commit
> as the work it describes. Pace the work by what the milestone needs, not by a clock — quality is
> independent of scope ([AGENTS.md](../AGENTS.md)). Build the best version of each thing you touch.

## Build order

The cut line rule ([DESIGN.md](DESIGN.md) decision 5): shell + one minigame end-to-end before any
second game. Submittable at every checkpoint. Each minigame gets a short design session before its
build (per-game specifics are listed under Deferred design in DESIGN.md).

| #   | Milestone                                                                                                                                          | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0   | Repo scaffolding — Next.js app, docs, templates, Playwright CI, deploy                                                                             | done        |
| 1   | Auth + roles — Supabase auth, profiles, owner allowlist, owner permissions page; auth E2E spec                                                     | done        |
| 2   | UI system — port console-kit (drop `chrome/`), retheme tokens, port UI.md, add `motion`                                                            | done        |
| 3   | Tournament shell — host/create, game code, lobby, teams, ready/start/lock; round-robin schedule + standings engine (pure, tested) + round board UI | done        |
| 4   | Match container — K-minigame reveal, zoom in/out, scoring screen, round + match lifecycle (pure) + Realtime channels + spectate                    | done        |
| 5   | Minigame 1: trivia tug-of-war + admin question-bank CRUD; CRUD E2E spec                                                                            | done        |
| 6   | Final standings + per-player normalization utilities                                                                                               | pending     |
| 7   | Open hosting — player-creatable games, config (minigame pool, K), "game" copy sweep (DESIGN decisions 14–15)                                       | done        |
| 8   | `displayName` (schema + backfill + label swap) + spectate-by-link (DESIGN decision 16)                                                             | in progress |
| 9   | Team rooms + roster fluidity — Board/My team tabs, persistent team picker, join/leave/kick under the lock rule (DESIGN decision 17); E2E           | pending     |
| 10  | Minigame 2: typing race                                                                                                                            | pending     |
| 11  | Minigame 3: word game (territory capture)                                                                                                          | pending     |
| 12  | Minigame 4: battleship                                                                                                                             | pending     |
| 13  | Polish pass — reconnect UX, reduced-motion, projector-scale check on the round board                                                               | pending     |

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

Milestone 5 is done: trivia tug-of-war (both server logic and play UI) and the admin question-bank
CRUD landed together, since the minigame has nothing to deal without content behind it. Landing the
first content-backed minigame grew the contract rather than special-casing trivia around it: `apply`
now takes a server-stamped `now` so time-based state (the rope's decay) stays deterministic off the
same clock as the route handler; an optional `outcome` lets a game declare a winner that overrides the
normalized-mean comparison (trivia's pin); an optional `redact` lets a game strip per-viewer payload
before a state ever reaches a client (trivia hides each player's own current question from opponents
and everyone's correct answers pre-reveal); and `init` now accepts route-supplied context, fetched at
the IO edge and awaited in the same mutate seam that gates a match into its next phase, so a pure
reducer never touches Prisma directly. `poolFor("production")` is no longer empty — trivia is the
first non-`devOnly` minigame, so production rounds can draw it — but the test pool flipped the other
way, to devOnly kinds only: E2E's database carries no question content, so a trivia draw in CI would
either 409 on the new empty-bank guard or need seeding on every run, and the stub still exercises
every board/match mechanic the suite checks. E2E stays stub-only by that guard, not because trivia is
unverified in CI.

Milestone 8's first half has landed ahead of the rest of the milestone: `displayName` is now a real,
`NOT NULL`, required-at-signup, user-editable `Profile` field (existing rows backfilled from the email
local part; edits go through `PATCH /api/profile`, from an inline editor on the home identity card), and
every other-player-facing label — lobby roster, presence, match member labels — renders it instead of
email. Home self-identity ("Signed in as {email}") and the admin permissions page still show email;
that's deliberate, not leftover. Spectate-by-link, the other half of M8 (DESIGN decision 16), hasn't
shipped yet — it's gated on this field, not on top of it.

Milestone 7 is done. Its first surface — the home reskin (event-join hero + inline displayName edit)
and the tournament→"event" UI-copy sweep (DESIGN decision 15) — shipped as Slice 1 of the
mockup-integration program. Slice 2 landed the rest: `/create` replaces `/host`, open to any
signed-in user rather than gated to admins; `isGameHost` gives host powers to a game's creator (or,
as a rescue path, any admin/owner) instead of to a role, applied at all six host-only routes. A
follow-up fix closed the gap between that API surface and the UI: `resolveViewer` now also reports
`canHost` (same `isGameHost` predicate), so a non-creator admin/owner sees and can use the lobby and
board host controls, not just the routes accepting their requests. Each `Tournament` now stores its
own `pool` (a per-game minigame subset, backed by a migration that
backfills existing rows to `['trivia']`), so the round draw intersects a game's stored pool with
what the environment can actually play instead of reading a single global pool. **Cut, not deferred:**
an earlier design paired the pool column with a per-game `maxTeams` (2–15); the maintainer cut
`maxTeams` entirely before this slice built it, so team count is capped only by the fixed 15-color
palette ceiling (`MAX_TEAMS`), the same for every game — there is no `maxTeams` field, column, or
stepper anywhere in the repo, and none should be added without a fresh decision (see DESIGN decision
14).

Slice 1.5 of the mockup-integration program landed between Slices 1 and 2, ahead of its approved
sequence: [UI.md](UI.md) had no responsive guidance at all, and Slices 2, 3 and 5 add eight-plus new
kit members between them, so the law was written before the members rather than retrofitted into
them. `UI.md` now carries the fluid floor-width law (375px floor; 207px of content inside the
narrowest card, since the register's 145% root makes a `p-8` gutter 46px, not 32), and `CodeInput` —
whose six fixed 48×56 cells demanded 328px and scrolled the whole join page sideways on a phone —
divides its row and scales each glyph with its own cell instead. Four more surfaces overflowed and
were fixed with it: home's identity card (a long email, whose inline overflow no element rect
reveals — only `scrollWidth`), home's owner-only account links, the match header's two
projector-scale team names either side of a projector-scale tally, and the showcase's specimen rows,
which are legitimately wider than a phone and now scroll inside their own section. The sweep is
guarded rather than remembered: `e2e/support/viewport.ts` asserts no surface exceeds the floor
width, because jsdom has no layout and cannot catch this class of bug at all. Two of those four were
found by the guard rather than by reading, both on role-specific variants a casual pass misses.
`/showcase` is the one route it cannot cover — `notFound()` under `NODE_ENV=production`, which is
what the suite builds — so it is verified by hand against a dev server.

## Known gaps (carry into the next branches)

- **Game reads still show emails to any signed-in user — CLOSED for other-player-facing surfaces.**
  The games-first design (DESIGN decision 16) makes open reads _intentional_ — spectate by link, play
  by code — so the old "lobby reads are open" gap stopped being a gap to close and became a leak to
  fix: the leaked data was emails. Milestone 8's first half (`displayName` schema + backfill + label
  swap) has landed and kills the leak everywhere a player sees another player — lobby roster, presence,
  match member labels. Home self-identity and the admin permissions page still show email by design,
  not oversight. What's still open: board/match reads stay membership-gated as built — the actual
  gate relaxation (spectate-by-link) is the rest of M8 and hasn't shipped.
- **Portaled overlays aren't inert'd by the wipe.** `WipeProvider`'s `inert` wrapper only covers the
  `{children}` subtree; `ModalShell`, `PopoverCard`, `Select`, `Tooltip`, and `FloatCard` all portal to
  `document.body`, outside it. A wipe fired while one is open leaves it focusable/clickable under the
  opaque panel, and the modal's own outside-hiding can silence the wipe's still-loading cue for screen
  readers. Must be solved before any navigation inside a modal opts into the wipe.
- **Production's only minigame depends on admin-authored content.** `poolFor("production")` is
  `["trivia"]` now that a non-`devOnly` minigame has landed, but a round draw that lands on trivia
  still needs the question bank populated: `checkContentReady` (`round-draw.ts`) 409s a round start
  closed, before any mutation, if the bank is empty, so an unseeded production deploy blocks starting
  a round rather than committing one with an unplayable slot. `npm run seed:trivia` (OpenTDB) is the
  fix, not code. E2E doesn't exercise this path — `JUMBO_TEST_MINIGAME_POOL`, set only in
  `playwright.config.ts`, flips the eligible pool to test mode, which admits only `devOnly` kinds, so
  the spawned E2E server keeps drawing the deterministic `stub` game instead of trivia. Round start,
  board auto-pull, spectate entry, byes, and the live-match `beforeunload` guard are all covered
  against `stub` (see `e2e/round-start.spec.ts`); trivia's own play surface is covered by unit tests
  and the admin question-bank CRUD spec, not by a round-start E2E run.
- **A round start's network wait is uncovered.** `BoardRoundStart` awaits the round-start POST before
  opening the wipe, so only the board swap plays covered. Awaiting inside `cover()` would be worse:
  React drops post-await updates out of the transition, so `isPending` — the machine's `committed`
  signal — falls before the refresh lands and the panel reveals early. Covering the wait needs a
  pending signal the machine can read that isn't the transition edge. Related and now closed: the wipe's two
  sweep phases each waited on a motion callback as their _only_ trigger, and `onCovered` is where every
  escape timer is armed — so a dropped in-sweep callback left no ceiling at all (an opaque panel over
  the app, permanently) and a dropped out-sweep callback left the panel mounted off-screen, invisible
  to a user but fatal to any assertion that it had cleared. Each waiting phase now carries a watchdog
  at its own sweep duration plus grace (`WipeProvider`, covered by `WipeProvider.test.tsx`). This is
  the most likely mechanism behind the round-start wipe-clear flake (`e2e/round-start.spec.ts`, seen
  both passing and failing at SHA `034a2b3`), but that flake did not reproduce locally over three runs,
  so the link is reasoned, not observed — if it recurs, the next stop is the `committed` edge itself,
  which a concurrent bare `router.refresh()` from `BoardRefresher` can plausibly swallow. Worth noting
  either way: `FORCE_REVEAL_MS` was 15s, exactly the suite's `expect` timeout, so a wipe that ever
  needed the ceiling raced the assertion waiting for it and failed at random. Slice 2 lowered it to
  8s, deliberately under the 15s timeout, so the ceiling firing no longer races the assertion.

---

_Last reviewed: 2026-07-25_
