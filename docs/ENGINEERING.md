# Engineering Principles

> Authority for **how code is structured and what "good" means** here. Read before writing or
> refactoring non-trivial code. Formatting/naming → [CODE_STYLE.md](CODE_STYLE.md); dev loop →
> [WORKFLOW.md](WORKFLOW.md); product facts → [DESIGN.md](DESIGN.md).

Each principle is a **rule + why**. When one is violated, fix the root cause or surface it — never
silently work around it.

## 1. Pure core, IO at the edges

Game logic — scoring, per-player normalization, match state transitions, answer checking, board
resolution — is **pure functions** over typed inputs: no DB reads, no network, no clock reads inside
them. Route handlers do IO at the edge (auth, fetch state, persist result) and pass data in.

- **Why:** pure logic is unit-testable without mocks and is where the real bugs live. A round-robin
  schedule and standings engine you can test in isolation is one you can trust live at hacknight.

## 2. Typed boundaries; validate external data at the edge

TypeScript `strict`, no `any`. **Every request body, param, and external payload is parsed with a Zod
schema at the route boundary** before any logic sees it. Shared schemas/types live in one place
(`src/lib/schemas`) and are imported, never re-declared. Prefer discriminated unions over loose
strings for closed sets (roles, match phases, game kinds).

- **Why:** graded criterion (backend input validation) made structural; downstream code trusts its data.

## 3. Server-authoritative games; Realtime is transport

The client sends **intents** to route handlers; handlers validate, authorize (role + team membership),
apply the pure game logic, persist, and broadcast. Clients render from subscribed state. The client
never computes an outcome the server just believes, and hidden state (battleship placements) is never
sent to the opposing team.

- **Why:** graded criterion (backend-enforced authorization) — and RLS can't be the enforcement layer
  because Prisma bypasses it ([DESIGN.md](DESIGN.md) decision 2).

## 4. One owner per fact (DRY by ownership)

Each piece of state has one owner; no two systems write the same data, no parallel implementations of
one responsibility. One scoring module both the live match and the rankings page call — not two.

## 5. Small composable units; no catch-all `utils/`

Each function/module does one thing; code lives with the feature it serves. A file growing large is a
signal it's doing too much.

## 6. Error handling discipline

Handle **expected** absence explicitly (no such join code, match already finished, user not on a
team) with typed error responses and correct HTTP status codes. For invariants that must hold, fail
loud — throw/500 and surface — rather than swallowing. Never leak internals or other users' data in
error messages (graded: no data-exposing logs).

## 7. Production-ready or surfaced

No dead/commented-out code, no leftover `console.log` debugging, no naked `TODO` without a tracked
issue. Temporary means: say why, and where it's tracked.

## 8. Compose, don't reinvent

Use what the stack already provides — Supabase Auth helpers, Realtime channels, Prisma migrations,
Next.js route conventions — before writing parallel machinery.

## Agent behavior

- **Read first, ground claims in inspection.** Inspect the relevant doc and code before proposing
  changes; no speculation presented as fact. Ambiguous → ask, don't invent.
- **Surface root cause.** On discovering an architectural violation, hidden coupling, duplicated
  ownership, or temporary logic becoming permanent: list it under a **Critical Findings** heading
  before proceeding.
- **Communicate high-level changes** after edits — what changed and why, briefly.
- **Bias:** root-cause fixes over shortcuts; industry-standard, modular, neat.

---

_Last reviewed: 2026-07-15_
