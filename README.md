# Jumbo Minigames

A team-based tournament of short co-operative minigames for JumboCode hacknights. Teams join with a
short code and face off in 1v1 best-of-3 matches drawn from a minigame pool; scoring is normalized
per-player so team sizes don't matter. Admins run the tournament and can spectate any live match.

**Live app:** https://jumbo-minigames.vercel.app

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Realtime) · Prisma ·
Playwright · Vercel

Start with [AGENTS.md](AGENTS.md) — it routes to the docs that own each topic (design, engineering
principles, code style, workflow, roadmap).

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier) — [supabase.com](https://supabase.com)

### Setup

```bash
git clone git@github.com:ajbarba01/jumbo-minigames.git
cd jumbo-minigames
npm install
cp .env.example .env.local   # then fill in your values
npx prisma generate          # generates the client into src/generated/
npx prisma migrate dev       # apply schema to your database
```

Every variable is documented in [.env.example](.env.example). Secrets live only in `.env.local`
(gitignored), Vercel env vars, and GitHub Actions secrets — never in the repo.

## Commands

| Command               | What it does                                |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Dev server at http://localhost:3000         |
| `npm run build`       | Production build                            |
| `npm run start`       | Serve the production build                  |
| `npm run typecheck`   | `tsc --strict`, no emit                     |
| `npm run lint`        | ESLint                                      |
| `npm run format`      | Prettier (write) — `format:check` to verify |
| `npm run test:e2e`    | Playwright E2E suite                        |
| `npm run test:e2e:ui` | Playwright in interactive UI mode           |

## Testing

Playwright E2E tests live in [e2e/](e2e/) and cover auth and CRUD flows. They run in GitHub Actions
on every push and PR against a dedicated test Supabase project with dedicated test users — see
[docs/WORKFLOW.md](docs/WORKFLOW.md).

## Contributing workflow

Branches are named `[topic]/[feature]` (e.g. `feature/trivia-tug-of-war`); all work merges via PR
using the template, and branches are deleted after merge. Full loop and quality gates:
[docs/WORKFLOW.md](docs/WORKFLOW.md).

## Project context

Built for the JumboCode Tech Lead onboarding project — graded criteria live verbatim in
[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md); design and decisions in [docs/DESIGN.md](docs/DESIGN.md).
