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
| 9   | Team rooms + roster fluidity — Board/My team tabs, persistent team picker, join/leave/kick under the lock rule (DESIGN decision 17); E2E           | done        |
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
first non-`devOnly` minigame, so production rounds can draw it — and the test pool admits every
registered kind, so nothing is auto-selected and each spec pins its own pool through
`e2e/support/create.ts`. The board/match specs all pin `stub`, which exercises every board and match
mechanic the suite checks without a content dependency; `e2e/trivia.spec.ts` pins trivia and seeds
the bank itself. A round draw that lands on trivia needs that bank populated: `checkContentReady`
(`round-draw.ts`) 409s a round start closed, before any mutation, if it is empty, so an unseeded
production deploy blocks starting a round rather than committing one with an unplayable slot —
`npm run seed:trivia` (OpenTDB) is the fix there, not code.

Milestone 8's first half has landed ahead of the rest of the milestone: `displayName` is now a real,
`NOT NULL`, required-at-signup, user-editable `Profile` field (existing rows backfilled from the email
local part; edits go through `PATCH /api/profile`, from an inline editor on the home identity card), and
every other-player-facing label — lobby roster, presence, match member labels — renders it instead of
email. Home self-identity ("Signed in as {email}") and the admin permissions page still show email;
that's deliberate, not leftover. Spectate-by-link, the other half of M8 (DESIGN decision 16), hasn't
shipped yet — it's gated on this field, not on top of it.

Slice 4 of the mockup-integration program landed the trivia reskin: the play surface now matches
the `trivia/` mockup's braided rope, team-washed walls, projector-scale clock and score pop, over
the same match engine, rope physics and scoring the earlier surface used untouched. `PlayFrame` now
zooms every minigame to full screen, for every slot phase, not just trivia's — the panel loses its
board-sticker chrome entirely, since a full-bleed surface is in-flow content rather than something
that floats (DESIGN decision 18, whose accepted cost is under "Known gaps"). `TeamChip` and `ScorePop`
joined `@jumbo/ui`, closing the last two motion-and-composition rows in `KIT-GAPS.md`; the trivia
mockup was retired with it. One functional change rode along: `redact` gained a per-viewer
`lastAnswer` field so the client can hold an answer-reveal beat before the next card replaces it —
it carries indices only, never answer text, and is suppressed on the deck-exhaustion path where the
next deal would otherwise be the same card just answered. The surface shipped with no E2E coverage
at the time; Slice 5 closed that.

Slice 5 landed the admin question-bank reskin and **closed the mockup-integration program** —
`admin-questions/` was the last mockup standing, and deleting it leaves `src/app/mockup/` holding
only the permanent `FakeMatchClient` dev harness and `KIT-GAPS.md`, whose every row is now either a
shipped member or a recorded decision not to build one. Four kit changes carried the surface:
`Textarea` and `SkeletonRows` joined `@jumbo/ui`, the kit `Select` gained a form-register
`size="field"` face, and `ConfirmDialog` gained a retryable `error` state so the delete dialog could
adopt it without losing its failure path. The pagination footer stayed page composition rather than
becoming a member, on the Slice 3 host-dock precedent — one consumer composes locally, a second one
promotes. One functional change rode along against the slice's no-functional-change rule, approved
before it was built: the bank filters by difficulty server-side (DESIGN decision 19). Trivia also
got its first end-to-end coverage here — `e2e/trivia.spec.ts` deals a card and asserts a correct
answer scores, made possible by widening the test pool to admit every registered kind so a spec can
pin trivia (both described under Milestone 5 above).

A short UI touch-up branch followed the mockup program's close. The background doodle layer now
**boils** — twelve authored paths, each cycling seeded redraws of itself in pure CSS (no JS timer
behind the app for decoration), staggered so the field never ticks in lockstep, coloured from the
15-hue team palette, and pinned to the authored frame under reduced motion. The seeding is
deterministic precisely because the layer renders on both server and client. It is tuned on a new
permanent Background section of `/showcase` that drives the same `DoodleField` the app mounts, so the
tuned result is the shipped one; `--color-s1` darkened one step under it, which is the last step the
scale's even-ramp rule allows (DESIGN decision 20). Three contained fixes rode along: home's account
links were shortened to hold one line at the card's full width — guarded in `responsive.spec` by a
shared-baseline assertion, since a wrap inside a card is invisible to the overflow guard, and the
guard runs at a desktop width because at the 375px floor those three links wrap by design; the rejoin
control became a named, full-width accent-2 action above the join hero, with `Join` and `Create a
game` squared to one width, which added a `second` variant to the kit `Button` rather than letting a
page style itself; and the minigame zoom lost its elastic edges — `SLIP_EASE_OUT` joined the kit as
the JS twin of the `--ease-slip` token, and the shared-element layout animation takes it, because a
rect whose target is the viewport edge has nothing to settle into past full screen. That last one was
measured rather than eyeballed: the old curve overshot the settled size by ~11px at t=191ms. The slam
wipe also reversed — it now sweeps right to left — and ships unlabelled at every call site; the
`label` prop and its showcase specimen stay, so the variant is preserved rather than deleted. Last,
the team tab gained an `OtherTeams` card under the viewer's own room: every other team's colour, name,
size and pre-start ready state, name-only by design. Joining a team used to _cost_ a player that
information — the ready column lived in the picker, which only an unassigned viewer sees — so a player
on a roster could not tell who was holding up the start. It needed no server change; the lobby DTO
already carried every team.

Milestone 9 is done, closing Slice 3 of the mockup-integration program: the lobby and the projector
board collapsed into one tabbed game page present at every phase, board/match reads opened to any
signed-in user, and roster fluidity shipped under the lock rule (mechanics: DESIGN decisions 16, 17).
The team mockup is retired now that its real surface has shipped. `Tabs` and `StatusLine` joined
`@jumbo/ui`, closing two more `KIT-GAPS.md` rows. Also landed, outside the plan: a fix making the
theme emit `--color-team-2` through `--color-team-15` statically, after Tailwind v4 tree-shook them
and left every team after the first with an invisible identity chip.

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

CI now runs once per commit. `on: [push, pull_request]` fired both events for a pushed branch with an
open PR, so every commit launched two identical suites against the single shared Supabase test
project — cross-run interference that made any non-atomic fixture a first-run race, and a standing
source of confusing red builds. `push` is now scoped to `main` and `pull_request` covers branches, so
each commit gets exactly one run and the merge commit is still verified on `main`. A concurrency
group cancels superseded runs on the same ref. The trade is real and accepted: a branch pushed before
its PR exists gets no CI, which suits a repo where every change goes branch → PR. Not fixed, and
deliberately so: two PRs, or a PR plus a `main` push, still race the same test project — a global
queue is the escalation if a second change is ever in flight.

The E2E suite now reuses authenticated personas instead of signing an account up per browser context.
This is a **separate** problem from the CI double-run above, partly hidden behind it: even at one run
per commit the suite made 57 sign-ups in under six minutes from a single IP, and the test Supabase
project accepts 30 per five minutes — measured directly against it, where the 31st returns
`over_request_rate_limit`. Sign-ins are a separate bucket of the same size, so swapping signup for
login would not have fixed it. Whichever specs sorted last therefore failed, on an opaque 400 from
the signup route that named no cause; `main` was red on that at `43027ef`. `e2e/support/personas.ts`
now provisions a seven-account cast — one admin, one non-admin host, four players, the allowlisted
owner — signs each in once per worker, and replays the session into every context via Playwright
storage state, taking a run from 60 auth requests (57 of them sign-ups) to 11 (3 sign-ups), and to 4
on a re-run inside the 30-minute session window. Two properties are load-bearing and neither is incidental: **roles live in the
persona layer, never in a spec** (a shared account promoted by one test would stay admin for every
later one and silently invert `authz.spec` — `promoteToAdmin` is gone from `e2e/support/db.ts`
entirely), and **accounts are per worker**, since parallel specs would otherwise drive one account
into two live games at once. Reused accounts also made two locators ambiguous that a throwaway signup
never could: home renders a `Rejoin <game>` button for any account already in a live game, which
matched a bare `Join` and made every bare `Rejoin` assertion pass vacuously — both are now pinned.
Local workers are capped at 4 (from the machine default of 11) because each one costs another persona
set against that same 30-request ceiling. `auth.spec.ts` deliberately keeps signing up and logging in
through the real form: that flow is the graded coverage, and it is now the only thing spending the
sign-up budget. Not fixed, and out of scope by decision: the signup route collapses every
`supabase.auth.signUp` failure into one opaque 400, which is what made this take two days to see —
worth its own change, since it is a production auth path under the no-leaky-logs floor.

## Milestone 6.5 — realtime over Durable Objects (landed dark, behind a flag)

Match authority moved off Next route handlers + Supabase Realtime onto one Cloudflare Durable Object
per match. The pure core was extracted to `packages/engine` (`@jumbo/engine`) and the wire contract to
`packages/protocol`, so the Next app and the new `apps/realtime` Worker drive a match through the same
reducer. During a slot the DO is authoritative: state lives in `ctx.storage`, sockets hibernate, slot
timers run on DO alarms, and Postgres is a write-behind archive reached only through two
secret-authenticated internal routes. Optimistic UI is two-tiered — trivia gets acknowledgement-only
feedback because it redacts the correct answer and a client cannot predict its own result.

**Status: complete but not enabled.** `NEXT_PUBLIC_REALTIME_WS` defaults to `0`; the Supabase path is
still the shipping one. The cutover (deploy the Worker, flip the flag, delete the old transport) is
its own task and has not been done.

Known gaps carried out of this milestone, all of which the cutover must address:

- **The full E2E suite cannot run with the flag on yet.** `trivia.spec.ts` and `round-start.spec.ts`
  drive a match by POSTing the legacy `/slots/:ordinal/force-start` route; with the socket transport
  on, the DO is authoritative and never sees that write. CI therefore runs the main suite at flag `0`
  plus a dedicated flag `1` step for `e2e/realtime.spec.ts`. The cutover deletes those routes and must
  rewrite both specs to drive through the UI.
- **One secret serves two purposes.** `REALTIME_SHARED_SECRET` is both the ticket-signing HMAC key and
  the bearer credential on Worker→Next calls. Disclosure of the bearer would allow forging a ticket for
  any player on any match. Split before enabling in production.
- **The roster is frozen at hydrate.** The DO never re-hydrates and never applies the engine's
  `rosterChanged` event, so a player kicked mid-match keeps acting — and because persist overwrites
  wholesale, a roster change made through the Next path is reverted.
- **`NEXT_PUBLIC_REALTIME_WS` is a whole-environment switch.** Two deployments at different flag values
  must never share a database: at flag `1` the DO overwrites all slots from its own lineage, so any
  legacy write in between is erased.
- **The tier-2 prediction stack is unreachable.** No shipped minigame declares `predict`, so
  `canPredict` is always false and `predictSlot`'s main path never runs. Either delete it or land it
  with the first game that needs it.

## Known gaps (carry into the next branches)

- **Portaled overlays aren't inert'd by the wipe.** `WipeProvider`'s `inert` wrapper only covers the
  `{children}` subtree; `ModalShell`, `PopoverCard`, `Select`, `Tooltip`, and `FloatCard` all portal to
  `document.body`, outside it. A wipe fired while one is open leaves it focusable/clickable under the
  opaque panel, and the modal's own outside-hiding can silence the wipe's still-loading cue for screen
  readers. Must be solved before any navigation inside a modal opts into the wipe.
- **Trivia surface follow-ups the reskin didn't take.** On the deck-exhaustion collision path
  `lastAnswer` is suppressed, so the answered card's choices never light up correct/wrong — the
  score still pops (both are keyed on the score movement, not on the reveal), but the player is told
  what they scored without being shown what the answer was. `TriviaView`
  carries `lastResult` per viewer and the client never reads it — dead payload either way it goes.
  `WinGlow` renders inside the surface's `overflow-y-auto` container, so it scrolls with the content
  it is supposed to wash. `decayRope` runs during render off a client clock, which can differ from
  the server-rendered value and warn on hydration.
- **The full-viewport minigame stage is sparse.** `GatePanel`, `CountdownOverlay`, `ScoringScreen`
  and the stub surface all inherit the full-bleed stage from DESIGN decision 18 without being
  designed for it — an accepted cost recorded there, still waiting on a pass that designs for the
  room.
- **`TeamChip`'s `colorIndex` is unbounded.** Nothing clamps it to the 15-color palette, so an index
  past `MAX_TEAMS` renders an undefined custom property (an invisible chip) rather than failing.
  Trivia's `TICKER_LENGTH` is likewise coupled to the ticker's hand-tuned reserved height by a
  comment rather than by code — the constant's own docblock says to change both together, which is
  the honest version of a link that isn't there.
- **The questions PATCH route can't null a nullable field.** `triviaQuestionUpdateSchema` is
  `.partial()` and the editor omits the keys it means to clear, so an admin can set a question's
  difficulty or category but never unset one — the save reports success and the old value stays.
  The fix is `z.null()` in the update schema plus a client that sends `null` rather than dropping
  the key. The editor's "no difficulty" option is honest on create and a no-op on edit until then.
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

_Last reviewed: 2026-07-27_
