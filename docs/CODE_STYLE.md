# Code Style

> Authority for **formatting, naming, comments, and documentation**. Read before writing any code.
> Architecture/quality → [ENGINEERING.md](ENGINEERING.md). Most of this is enforced by tooling — when
> in doubt, run the tools.

## Tooling

- **Prettier** formats; **ESLint** lints; **`tsc --strict`** type-checks (`npm run typecheck`).
  Code failing any does not get committed. Never hand-format around the formatter.
- Line length 80 (Prettier default). A type error is a build failure, not a warning.

## Header comments (graded requirement)

**Every file starts with a header comment describing its intended functionality** — what this
page/component/route/module is for, in 1–3 lines. Precise and accurate, not filler.

```ts
/**
 * Route handler for submitting a trivia answer: validates the payload,
 * checks team membership, applies scoring, and broadcasts the new match state.
 */
```

## Comments (minimal by default)

**The default for any line of code is no comment.** The required header comment is the one
exception; beyond it, add a comment only when the WHY is genuinely non-obvious from the code.

- Comments explain **WHY**, never restate WHAT. If code needs a comment to say what it does, write
  clearer code instead.
- **No narration.** Comments that walk through what the next lines do are noise and are banned:

  ```ts
  // BAD: narration, restates the code
  // Loop through the players and add up their scores
  // Now we check if the team has won
  // First, we get the user from the database

  // GOOD: a non-obvious why
  // Supavisor transaction mode drops prepared statements; keep queries single-shot.
  ```

- **State decisions impersonally.** A comment records what the code does and
  why, never who decided it. No appeals to authorship or authority, no
  editorial emphasis:

  ```ts
  // BAD: attributes the decision, editorializes
  // Square corners everywhere — the maintainer call is zero radius, no exceptions.

  // GOOD: states the decision and its reason
  // Square corners everywhere; the radius tokens stay as the axis for a softer theme.
  ```

- No emojis in code, no commented-out code, no filler ("this is important", "note that", "simply").
- Never reference a plan phase, ticket ID, or internal codename in a comment (it rots).
- TSDoc (`/** … */`) on exported functions and shared types; `@param`/`@returns` only when they add
  information beyond name and type.

## Prose (applies to ALL writing in this repo)

Docs, README, PR descriptions, commit subjects, issue text, error messages, UI copy — everything.

- **Professional and straightforward.** Short declarative sentences. Say the thing once and stop.
- No hype ("blazing", "seamless", "powerful"), no enthusiasm filler ("Let's dive in!"), no
  exclamation marks, no emojis, no rhetorical questions.
- No hedging padding ("it's worth noting that", "as you can see", "basically").
- Prefer the concrete over the abstract: name the file, the command, the number.

## Naming

- `camelCase` variables/functions; `PascalCase` types/components (no `I` prefix); `UPPER_CASE` true
  constants and tuning knobs (e.g. `BEST_OF`, `ROUND_SECONDS`).
- Booleans read as predicates: `isOwner`, `hasAnswered`, `shouldAdvance`.
- Descriptive, unabbreviated. Match the domain vocabulary in [DESIGN.md](DESIGN.md) — a `Tournament`,
  a `Team`, a `Match`, a `Minigame`; don't invent synonyms.
- Named constants for non-obvious numbers — no magic literals buried in game logic.

## Files & folders

- Components: `PascalCase.tsx`, one primary export per file, file named for it.
- Non-component source: `kebab-case.ts` (`match-state.ts`, `join-code.ts`).
- Pure game logic lives under `src/lib/` with unit tests beside it; route handlers stay thin.
- E2E specs live in `e2e/`.

## Imports

- Order: external packages → `@/` internal → relative. Use the `@/*` alias over `../../..` chains.
- No unused imports (ESLint enforces).

---

_Last reviewed: 2026-07-15_
