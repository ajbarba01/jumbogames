<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# jumbogames

A **team-based tournament of short co-operative minigames** for JumboCode hacknights. Teams join with a
short code and play a **round-robin** of short matches drawn from a minigame pool; scoring is normalized
per-player so team sizes don't matter. Admins run the tournament and can spectate matches live.

Built for the JumboCode Tech Lead onboarding project — the graded criteria in
[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) are **non-negotiable requirements**, not suggestions.

> **This file (`AGENTS.md`) is the shared source of truth for _how_ work is done here.** Claude reads
> [CLAUDE.md](CLAUDE.md) (`@AGENTS.md`). It is a **router**, not a knowledge dump — given a task, open the
> one doc that owns it, just-in-time.

## Doc navigation (read the one that owns your task)

| Doc                                          | Authority over                                                         | Read before…                         |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | **Graded criteria** — the assignment, verbatim                         | scoping or cutting anything          |
| [docs/DESIGN.md](docs/DESIGN.md)             | **Product + project facts** — game design, stack, rationale, decisions | anything product-specific            |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | **Build order + status** — what's done, what's next, the cut line      | orienting / picking the next task    |
| [docs/ENGINEERING.md](docs/ENGINEERING.md)   | Architecture & code-quality principles                                 | writing/refactoring non-trivial code |
| [docs/CODE_STYLE.md](docs/CODE_STYLE.md)     | Formatting, naming, comments (incl. required header comments)          | writing any code                     |
| [docs/UI.md](docs/UI.md)                     | Design laws + kit authoring rules (the `@jumbo/ui` register)           | any UI work                          |
| [docs/WORKFLOW.md](docs/WORKFLOW.md)         | Dev loop, branches, PRs, quality gates                                 | starting work / committing           |

## Operating rules (always on)

- **Hierarchical context.** Load a doc just-in-time when the task needs it; don't load everything.
- **Single source of truth.** Each fact lives in exactly one doc. Cross-link; never restate.
- **Same-commit rule.** A change that adds/moves/deletes files or alters behavior updates the relevant
  doc in the _same_ commit (README, ROADMAP status, DESIGN decisions).
- **No code-as-doc.** No function signatures or long path lists in docs — they rot; grep is faster.
- **Last-reviewed footer.** Every doc carries one; treat a stale doc (> 30 days here) as suspect.
- **Read first, ground claims in inspection.** Inspect the relevant doc and code before proposing
  changes. Where a requirement or design is genuinely ambiguous, **ask** — don't invent a decision.
- **No sycophancy, no assumptions.** Disagree when warranted; ask clarifying questions when unsure.

## Constitution (non-negotiables)

- **TypeScript `strict`, no `any`.**
- **Server-authoritative games.** Every game mutation goes through a Next.js route handler that
  validates input (Zod) and enforces authorization (role + membership checks). The client never writes
  game state directly; Supabase Realtime is **read-side transport only** (see ENGINEERING).
- **Security floor (graded):** no secrets in the repo, no plaintext passwords, backend-enforced
  authorization, backend input validation, safe (Prisma-parameterized) queries, no data-leaking logs.
- **Every file has a header comment** describing its intended functionality (graded — see CODE_STYLE).
- **Branch per feature (`[topic]/[feature]`), PR with template, delete merged branches** (graded — see
  WORKFLOW). Never commit directly to `main` once CI exists.
- **Playwright E2E covers auth + CRUD flows** and runs in GitHub Actions (graded).
- **Core game logic is pure and unit-testable** — scoring, normalization, match state transitions take
  typed inputs and return results; IO happens at the edges.
- **Quality is independent of scope.** Two-week project, professional code.

## Stack (one-liner; rationale in [docs/DESIGN.md](docs/DESIGN.md))

Next.js (App Router) · TypeScript `strict` · Tailwind CSS · Supabase (Postgres + Auth + Realtime) ·
Prisma · Zod · Playwright · GitHub Actions · Vercel.

---

_Last reviewed: 2026-07-15_
