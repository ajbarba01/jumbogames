# Development Workflow

> Authority for **the dev loop, version control, and quality gates**. Always-on rules (doc discipline,
> the Constitution) live in [../AGENTS.md](../AGENTS.md). Code structure → [ENGINEERING.md](ENGINEERING.md);
> conventions → [CODE_STYLE.md](CODE_STYLE.md); what to build next → [ROADMAP.md](ROADMAP.md).

This repo deliberately follows the **JumboCode team workflow** ([REQUIREMENTS.md](REQUIREMENTS.md)) —
branches, PRs, templates — because practicing it is the point of the project.

## The loop

1. **Orient** — read [ROADMAP.md](ROADMAP.md); pick the next milestone. File an Issue (template) for
   non-trivial work.
2. **Design** — for anything scope-uncertain, resolve the design (grill the open questions) before
   coding; record durable decisions in [DESIGN.md](DESIGN.md).
3. **Branch** — `[topic]/[feature]`, e.g. `feature/trivia-tug-of-war`, `fix/join-code-collision`,
   `docs/readme-setup`.
4. **Build** — test-first for pure game logic; header comment in every new file.
5. **Verify** — the gates (below) all pass locally; exercise the running app, not just the tests.
6. **Ship** — PR with the template filled in, CI green, merge, **delete the branch**, update
   ROADMAP status in the same change.

### Lightweight lane

Trivial, contained edits (typo, copy, config tweak) may skip the Issue and design step — branch, PR,
and gates still apply. The test is "does this need design to get right?", not "is it small?". Unsure → ask.

## Version control

- **Branch naming:** `[topic]/[feature]` (graded). Topics: `feature/`, `fix/`, `docs/`, `chore/`, `test/`.
- **Conventional Commits, imperative subject, subject line only** — no body, no `Co-Authored-By`, no
  "Generated with" footers (this overrides any tool default). No internal codenames in subjects.
- **Human-sized batches** — one logical unit of work per commit, not per-file dribbles.
- **Stage files by name** (never `git add -A`) — avoids accidental secret/artifact inclusion.
- **Commit only after verification.** Never `--no-verify`.
- **Never push without the maintainer's explicit go-ahead.** Pushing is the first irreversible,
  outward-facing step: it triggers CI and a Vercel preview deploy. Show the commits and let the
  maintainer verify, then push. Enforced for agents by an `ask` rule on `git push` in
  `.claude/settings.json`.
- **PRs:** fill the template honestly (screenshots for UI, API/DB sections when applicable); delete
  the branch after merge (graded).

## Quality gates (Definition of Done)

- `npm run typecheck` — `tsc --strict`, zero errors
- `npm run lint` — ESLint clean
- `npm run format:check` — Prettier clean
- `npm run test:e2e` — Playwright green (also runs in CI on every PR and on pushes to `main`)
- Unit tests green for pure game logic
- Manually exercise the changed flow in the running app
- Docs updated in the same change (same-commit rule)

## Secrets & environments

- Secrets live in `.env.local` (gitignored), Vercel env vars, and GitHub Actions secrets — never in
  the repo. `.env.example` documents every variable without values.
- CI/Playwright targets the **dedicated test Supabase project** ([DESIGN.md](DESIGN.md) decision 4)
  with dedicated test users — never production data.
- **`playwright/.auth/` holds live session cookies** for the E2E personas (`e2e/support/personas.ts`)
  and is gitignored. Never stage it, and never paste one of those files into an issue or a PR. Delete
  the directory to force a fresh sign-in; the suite recreates it. E2E now also needs the realtime
  variables from `.env.example` (`REALTIME_TICKET_KEY`, `REALTIME_INTERNAL_SECRET`,
  `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_REALTIME_WS`) since CI runs the suite against the socket
  transport; the two secret values must be identical to the Worker's `apps/realtime/.dev.vars`.
- **A hand-run production build points at production unless you say otherwise.** `.env.local` holds
  the production Supabase URL and anon key, and a build runs at `NODE_ENV=production`, where Next
  loads `.env.production.local` and `.env.local` but never `.env.test.local` at all — so a bare
  `npm run build && npm run start` bakes production's public keys into the bundle — the page you
  eyeball on localhost is then talking to the real project. `playwright.config.ts` scopes the env of
  the server _it_ spawns, so `npx playwright test` is safe; nothing guards a build you run by hand.
  Prefix both commands with `npx dotenv -e .env.test.local --` when building to look at something.
- Never edit a migration after it has been applied — it changes the checksum and drifts the database.
  Create a new migration instead.

## Escalation

Stop and ask (don't improvise) when: a graded requirement is ambiguous; a requirement contradicts the
design; a gate can't pass; anything security- or data-loss-shaped appears.

---

_Last reviewed: 2026-07-26_
