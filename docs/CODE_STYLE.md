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

## Comments

- Comments explain **WHY**, never restate WHAT. If code needs a comment to say what it does, prefer
  clearer code.
- Precise and sparse — no AI-slop narration, no emojis in code, no commented-out code.
- Never reference a plan phase, ticket ID, or internal codename in a comment (it rots).
- TSDoc (`/** … */`) on exported functions and shared types; `@param`/`@returns` only when they add
  information beyond name and type.

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

_Last reviewed: 2026-07-14_
