# Auth + roles — design (Milestone 1)

Owns: the design for ROADMAP milestone 1. Product/role facts live in
[../../DESIGN.md](../../DESIGN.md); this spec does not restate them, it applies
them. Terminal state after review: a writing-plans implementation plan.

## Goal

Supabase email/password authentication for the App Router, a `profiles` table
with a `player | admin | owner` role, an `OWNER_EMAILS` allowlist that grants
owner at signup, an owner-only permissions page whose authorization is enforced
in the route handler, and a Playwright auth E2E spec that runs in CI against the
test Supabase project.

## Decisions carried in

- **Profile creation: lazy server-side upsert** on the first authenticated
  request (confirmed with maintainer). No triggers on `auth.users`; all logic
  stays in route handlers, legible to beginner devs, and robust to users created
  out-of-band via the Supabase dashboard.
- **Authorization in route handlers, not RLS** (DESIGN.md decision 2 — Prisma
  connects as the DB owner and bypasses RLS). RLS is enabled deny-all on
  `public.profiles` as defense in depth so the anon/Realtime path can never read
  it; the handlers remain the only door.
- **Owner is env-only and immutable in the UI.** The permissions toggle moves a
  user between `player` and `admin`; owner is granted solely by `OWNER_EMAILS`
  (DESIGN.md "Roles").

## Data model (first Prisma migration)

- `enum Role { player admin owner }`.
- `model Profile`:
  - `id String @id` — equals the Supabase `auth.users.id` (uuid as text).
  - `email String @unique`.
  - `role Role @default(player)`.
  - `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
- No foreign key to `auth.users`: it lives in the `auth` schema which Prisma
  does not own. `Profile` is the application's mirror of the auth user, keyed by
  the same id.
- Migration also enables RLS deny-all on `public.profiles` (raw SQL appended to
  the generated migration, since Prisma does not model RLS).

## Components and boundaries

Each unit does one thing; IO lives at the edges (ENGINEERING principles 1, 5).

- `src/lib/supabase/server.ts` — Supabase server client bound to Next request
  cookies via `@supabase/ssr`. Used by route handlers and server components.
- `src/lib/supabase/client.ts` — Supabase browser client for the login/signup
  form components.
- `src/middleware.ts` — refreshes the auth session cookie on each request as
  `@supabase/ssr` requires. It performs **no** authorization; that is the
  handlers' job.
- `src/lib/prisma.ts` — runtime Prisma client via `@prisma/adapter-pg` and
  `DATABASE_URL`, as a module singleton (avoids exhausting pooled connections in
  dev hot-reload).
- `src/lib/auth/profile.ts`:
  - `getOrCreateProfile(user)` — upserts a `Profile` by `id`. Role resolves to
    `owner` when the normalized email is in `OWNER_EMAILS`, otherwise the
    existing role is preserved (new rows default `player`).
  - `requireUser()` — returns the current auth user and profile, or a typed
    unauthorized result for handlers to translate to 401.
  - `requireOwner()` — as above, plus a 403 result when the profile role is not
    `owner`.
- `src/lib/env.ts` — parses `OWNER_EMAILS` (comma-separated) once into a
  normalized `Set<string>`; single owner of that fact.
- `src/lib/schemas/auth.ts` — Zod schemas for the auth and role-change request
  bodies. Shared, imported, never re-declared (ENGINEERING principle 2).

## Routes

Auth mutations go through route handlers (server-authoritative). Handlers
Zod-validate the body, then act.

- `POST /api/auth/signup` — `{ email, password }`. Creates the auth user via the
  server client. With email confirmation off, the user is signed in; the profile
  is created lazily on the next authenticated request.
- `POST /api/auth/login` — `{ email, password }`. Signs in.
- `POST /api/auth/logout` — signs out, clears the session.
- `GET /api/admin/users` — `requireOwner()`; returns id, email, role for all
  profiles.
- `PATCH /api/admin/users/[id]/role` — `requireOwner()`; body `{ role: player |
admin }`. Rejects setting or clearing `owner`, and rejects an owner changing
  their own row. Persists via Prisma.

## Pages

- `/` (landing) — replaces the scaffold. Server component: unauthenticated users
  are routed to `/login`; authenticated users see a minimal app home (enough to
  prove the session and show logout; the real tournament home lands in later
  milestones).
- `/login`, `/signup` — client form components posting to the handlers.
  Redirect to `/` when already authenticated (checked server-side).
- `/admin/permissions` — server component gated by `requireOwner()` (redirect to
  `/` otherwise). Lists users and renders the player/admin toggle, which calls
  the PATCH handler.

## Environment and logistics

- No new env vars: `.env.example` already documents `OWNER_EMAILS`, the Supabase
  URL/anon key, and `DATABASE_URL` / `DIRECT_URL`.
- **Email confirmation must be OFF** in both Supabase projects for password
  signup to complete without an email round-trip. The Supabase CLI is logged
  into the Tufts account, which owns the **test** project — disable it there via
  the management API. The **production** project is on the maintainer's personal
  account and must be changed by the maintainer; this is a handoff step.
- `.env.local` targets production; `.env.test.local` targets the test project.
  GitHub Actions secrets already point at the test project.
- **Vercel deploy and live-URL verification** need the maintainer's account and
  are the final DoD step, handed off with exact instructions.

## Testing

- `e2e/auth.spec.ts` — one spec covering the graded auth flow: signup with a
  per-run unique email lands authenticated; logout returns to `/login`; login
  with the same credentials authenticates again. Runs against the test project
  locally and in CI (Playwright config and CI secrets already exist).
- Pure units in this milestone are thin (`env.ts` parsing, the owner-email
  check). Where a pure function exists it gets a unit test beside it; auth IO is
  covered by the E2E spec, not mocked.

## Definition of done

- Quality gates green (WORKFLOW.md): `typecheck`, `lint`, `format:check`,
  `test:e2e`, any units.
- Auth E2E passing in CI against the test project.
- Header comment in every new file; PR template filled honestly.
- ROADMAP milestone 1 flipped to `done` in the same PR.
- Branch merged and deleted; the auth flow verified on the live Vercel URL.

## Out of scope (YAGNI for M1)

- Password reset, email change, OAuth providers, rate limiting.
- Admin-facing features beyond the permissions page (question bank etc. are
  later milestones).
- The retheme/UI-kit port (milestone 2) — M1 pages are functional and plain.
