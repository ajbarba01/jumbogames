# Auth + roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Supabase email/password auth, a `profiles` table with a
`player | admin | owner` role, an `OWNER_EMAILS` allowlist, and an owner-only
permissions page whose authorization is enforced in route handlers, with a
Playwright auth E2E spec green in CI.

**Architecture:** Server-authoritative. Auth mutations go through Next.js route
handlers that Zod-validate input; the browser talks to Supabase only through
`@supabase/ssr` for session cookies. Prisma (via `@prisma/adapter-pg`) owns the
`public` schema and is the authorization enforcement layer — profile rows are
created by a lazy upsert on the first authenticated request. Pure logic (owner
allowlist parsing) is unit-tested; auth IO is covered by the E2E spec.

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind ·
`@supabase/ssr` 0.12 · Supabase Auth · Prisma 7 + `@prisma/adapter-pg` · Zod 4 ·
Vitest (new) · Playwright.

## Global Constraints

Copied verbatim from the spec, AGENTS.md, and the code/workflow docs. Every task
inherits these.

- TypeScript `strict`, **no `any`**.
- **Header comment at the top of every file** describing its intended
  functionality (graded). Minimal comments otherwise; explain WHY not WHAT.
- No emojis in code; Prettier default (80 cols); no commented-out code; no naked
  `TODO`.
- **Server-authoritative:** every mutation is a route handler that Zod-validates
  the body and enforces authorization (role checks) server-side. Authorization
  is enforced in handlers, **not RLS** (Prisma bypasses RLS).
- **Owner is env-only and immutable in the UI.** The permissions toggle moves a
  user between `player` and `admin` only.
- **Next 16 breaking changes** (verified against `node_modules/next/dist/docs/`):
  the middleware file convention is renamed to **`proxy.ts`** (export a function
  named `proxy`); `cookies()` from `next/headers` is **async** (`await`); a route
  handler's `params` is a **`Promise`** (`await ctx.params`).
- **Prisma client** is generated (gitignored) to `src/generated/prisma` via the
  `prisma-client` generator; import through the `@/generated/prisma/client` alias.
- **Conventional Commits, imperative subject line only** — no body, no
  `Co-Authored-By`, no "Generated with" trailer.
- Work on branch `feature/auth-and-roles`; keep the `docs: add auth and roles
design spec` commit as the branch base.
- Shared Zod schemas live in `src/lib/schemas`; the `@/*` alias maps to `src/*`.

**Spec:** [docs/superpowers/specs/2026-07-14-auth-and-roles-design.md](../specs/2026-07-14-auth-and-roles-design.md).

---

## File structure

Created/modified across the plan:

- `src/lib/auth/owner-email.ts` — pure allowlist parsing + membership (unit-tested).
- `src/lib/env.ts` — typed access to required env vars.
- `src/lib/prisma.ts` — runtime Prisma client singleton (driver adapter).
- `src/lib/supabase/server.ts` — Supabase server client bound to request cookies.
- `src/lib/supabase/client.ts` — Supabase browser client.
- `src/proxy.ts` — session-cookie refresh (Next 16 proxy convention).
- `src/lib/auth/profile.ts` — `getOrCreateProfile`, `requireUser`, `requireOwner`.
- `src/lib/schemas/auth.ts` — Zod schemas for auth + role-change bodies.
- `src/app/api/auth/{signup,login,logout}/route.ts` — auth handlers.
- `src/app/api/admin/users/route.ts` — list users (owner-only).
- `src/app/api/admin/users/[id]/role/route.ts` — set role (owner-only).
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` — auth forms.
- `src/app/page.tsx` — landing / minimal authed home (rewrite).
- `src/app/admin/permissions/page.tsx` — owner permissions UI.
- `prisma/schema.prisma` — Role enum + Profile model (modify).
- `prisma/migrations/**` — first migration (+ RLS SQL).
- `vitest.config.ts`, `playwright.config.ts` (modify), `e2e/auth.spec.ts`,
  `e2e/smoke.spec.ts` (modify), `package.json` (modify), CI workflow (modify).

---

## Task 1: Unit harness + owner-email allowlist (pure, TDD)

Establishes Vitest (the project's first unit runner — the constitution requires
pure logic to be unit-testable) and the one genuinely pure module in M1.

**Files:**

- Create: `vitest.config.ts`
- Create: `src/lib/auth/owner-email.ts`
- Test: `src/lib/auth/owner-email.test.ts`
- Modify: `package.json` (devDep `vitest`, script `test:unit`)

**Interfaces:**

- Produces: `parseOwnerEmails(raw: string | undefined): Set<string>` and
  `isOwnerEmail(email: string, allowlist: Set<string>): boolean`. Both
  case-insensitive on a trimmed, lowercased email; empty/whitespace entries
  dropped.

- [ ] **Step 1: Add Vitest and the unit script**

Run:

```bash
npm install -D vitest
```

Then in `package.json` `scripts`, add:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
/**
 * Vitest configuration for pure unit tests (co-located *.test.ts files under
 * src/). E2E flows live in e2e/ and run under Playwright, excluded here.
 */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/auth/owner-email.test.ts`:

```ts
/**
 * Unit tests for owner-email allowlist parsing and membership.
 */
import { describe, it, expect } from "vitest";
import { parseOwnerEmails, isOwnerEmail } from "./owner-email";

describe("parseOwnerEmails", () => {
  it("splits comma-separated emails, trimming and lowercasing", () => {
    const set = parseOwnerEmails(" A@x.com , b@Y.com ");
    expect(set).toEqual(new Set(["a@x.com", "b@y.com"]));
  });

  it("drops empty entries and handles undefined", () => {
    expect(parseOwnerEmails("a@x.com,,")).toEqual(new Set(["a@x.com"]));
    expect(parseOwnerEmails(undefined)).toEqual(new Set());
    expect(parseOwnerEmails("")).toEqual(new Set());
  });
});

describe("isOwnerEmail", () => {
  it("matches case-insensitively", () => {
    const set = parseOwnerEmails("owner@x.com");
    expect(isOwnerEmail("OWNER@x.com", set)).toBe(true);
    expect(isOwnerEmail("other@x.com", set)).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `./owner-email`.

- [ ] **Step 5: Implement the module**

Create `src/lib/auth/owner-email.ts`:

```ts
/**
 * Pure helpers for the OWNER_EMAILS allowlist: parse the comma-separated env
 * value into a normalized set and test membership. No IO; unit-tested.
 */
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function parseOwnerEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map(normalize)
      .filter((email) => email.length > 0),
  );
}

export function isOwnerEmail(email: string, allowlist: Set<string>): boolean {
  return allowlist.has(normalize(email));
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck && npm run lint`

```bash
git add package.json package-lock.json vitest.config.ts src/lib/auth/owner-email.ts src/lib/auth/owner-email.test.ts
git commit -m "test: add owner-email allowlist helpers with unit tests"
```

---

## Task 2: Prisma schema, first migration, client singleton

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_init_profiles_and_roles/migration.sql` (generated, then edited)
- Create: `src/lib/prisma.ts`
- Modify: `package.json` (devDep `dotenv-cli`; scripts `postinstall`, `db:migrate`)
- Modify: `.github/workflows/playwright.yml` (generate + migrate deploy)

**Interfaces:**

- Produces: `prisma` (a `PrismaClient` singleton) from `@/lib/prisma`; the
  `Profile` model and `Role` enum from `@/generated/prisma/client`. `Role` values:
  `player`, `admin`, `owner`. `Profile` fields: `id` (String, PK = auth user id),
  `email` (String, unique), `role` (Role, default `player`), `createdAt`,
  `updatedAt`.

- [ ] **Step 1: Define the schema**

In `prisma/schema.prisma`, keep the existing `generator`/`datasource` blocks and
append:

```prisma
enum Role {
  player
  admin
  owner
}

/// Application mirror of a Supabase auth user, keyed by the same id. Created
/// lazily on first authenticated request. No FK to auth.users (different schema).
model Profile {
  id        String   @id
  email     String   @unique
  role      Role     @default(player)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("profiles")
}
```

- [ ] **Step 2: Add the driver adapter and dev-migration tooling**

Run:

```bash
npm install -D dotenv-cli
```

In `package.json` `scripts`, add:

```json
"postinstall": "prisma generate",
"db:migrate": "dotenv -e .env.test.local -- prisma migrate dev",
"db:deploy": "prisma migrate deploy"
```

Rationale: `postinstall` regenerates the gitignored client on every `npm ci`
(local and CI). `db:migrate` targets the **test** project — `dotenv-cli` loads
`.env.test.local` first, and `prisma.config.ts`'s own dotenv does not override an
already-set `DIRECT_URL`, so production (`.env.local`) is never touched during
development. `db:deploy` uses the ambient env (CI secrets, or the maintainer's
`.env.local` for production).

- [ ] **Step 3: Generate the migration against the test project**

Run:

```bash
npm run db:migrate -- --name init_profiles_and_roles
```

Expected: a new `prisma/migrations/<ts>_init_profiles_and_roles/` with
`migration.sql`, applied to the test database; `prisma generate` runs.

If Prisma reports a shadow-database error (Supabase pooler cannot create one),
fall back to: `npm run db:migrate -- --name init_profiles_and_roles --create-only`
to write the SQL without applying, then apply with
`dotenv -e .env.test.local -- prisma migrate deploy`.

- [ ] **Step 4: Append RLS deny-all to the migration**

Edit the generated `migration.sql`, appending (defense in depth — the anon /
Realtime path can never read the table; Prisma connects as the owner and is
unaffected):

```sql
-- Deny-all RLS: handlers are the only door to profiles (Prisma bypasses RLS).
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
```

Re-apply so the test DB reflects it:

```bash
dotenv -e .env.test.local -- prisma migrate deploy
```

- [ ] **Step 5: Create the Prisma client singleton**

Create `src/lib/prisma.ts`:

```ts
/**
 * Runtime Prisma client singleton. Connects through the pg driver adapter using
 * the pooled DATABASE_URL (transaction mode). A module-global instance avoids
 * exhausting pooled connections under dev hot-reload.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Note: if the installed `@prisma/adapter-pg` rejects `{ connectionString }`,
construct a `pg.Pool` and pass it instead — verify against the version in
`node_modules/@prisma/adapter-pg`.

- [ ] **Step 6: Wire CI to generate the client and apply migrations**

In `.github/workflows/playwright.yml`, after `- run: npm ci` add a migrate step,
and confirm generation. Because `postinstall` runs `prisma generate` during
`npm ci`, no separate generate step is needed; add before the tests:

```yaml
- run: npx prisma migrate deploy
```

This reads `DIRECT_URL` from the job `env` (test-project secret) and applies the
migration to the test DB before E2E.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add prisma/schema.prisma prisma/migrations src/lib/prisma.ts package.json package-lock.json .github/workflows/playwright.yml
git commit -m "feat: add profiles table, Role enum, and Prisma client"
```

---

## Task 3: Supabase SSR clients + proxy session refresh

**Files:**

- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/proxy.ts`

**Interfaces:**

- Produces: `createClient()` from `@/lib/supabase/server` (async → server
  `SupabaseClient`) and from `@/lib/supabase/client` (sync → browser client).
  `src/proxy.ts` exports `proxy(request)` and `config`.

- [ ] **Step 1: Server client**

Create `src/lib/supabase/server.ts`:

```ts
/**
 * Supabase server client bound to the current request's cookies via
 * @supabase/ssr. Used by route handlers and server components.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll from a Server Component is a no-op; the proxy refreshes
            // session cookies on the next request.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Browser client**

Create `src/lib/supabase/client.ts`:

```ts
/**
 * Supabase browser client for client-component auth forms.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Proxy (Next 16 middleware convention)**

Create `src/proxy.ts`:

```ts
/**
 * Request proxy (Next 16's renamed middleware): refreshes the Supabase auth
 * session cookie on each request so server components and handlers see a valid
 * user. Performs no authorization — that lives in the route handlers.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 4: Verify boot and commit**

Run: `npm run typecheck && npm run build`
Expected: build succeeds. (Env values come from `.env.local`; the app boots.)

```bash
git add src/lib/supabase/server.ts src/lib/supabase/client.ts src/proxy.ts
git commit -m "feat: add Supabase SSR clients and session-refresh proxy"
```

---

## Task 4: Profile lazy-upsert + auth guards + Zod schemas

**Files:**

- Create: `src/lib/auth/profile.ts`
- Create: `src/lib/schemas/auth.ts`

**Interfaces:**

- Consumes: `prisma` (`@/lib/prisma`), `createClient` (`@/lib/supabase/server`),
  `parseOwnerEmails`/`isOwnerEmail` (`@/lib/auth/owner-email`), `Role`
  (`@/generated/prisma/client`).
- Produces:
  - `getOrCreateProfile(): Promise<Profile | null>` — upserts the current auth
    user's profile; `null` when unauthenticated.
  - `requireUser(): Promise<AuthOk | AuthErr>` and `requireOwner(): Promise<AuthOk
| AuthErr>` where `AuthOk = { ok: true; profile: Profile }` and `AuthErr = {
ok: false; status: 401 | 403 }`.
  - `credentialsSchema` (`{ email: string; password: string }`) and
    `roleChangeSchema` (`{ role: "player" | "admin" }`) from `@/lib/schemas/auth`.

- [ ] **Step 1: Zod schemas**

Create `src/lib/schemas/auth.ts`:

```ts
/**
 * Shared Zod schemas for auth and role-change request bodies. Parsed at the
 * route boundary before any handler logic runs.
 */
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export type Credentials = z.infer<typeof credentialsSchema>;

// Owner is env-only and never assignable here; the UI toggles player/admin.
export const roleChangeSchema = z.object({
  role: z.enum(["player", "admin"]),
});

export type RoleChange = z.infer<typeof roleChangeSchema>;
```

- [ ] **Step 2: Profile helper + guards**

Create `src/lib/auth/profile.ts`:

```ts
/**
 * Profile lifecycle and authorization guards. getOrCreateProfile lazily upserts
 * the current auth user's profile (owner when the email is allowlisted).
 * requireUser/requireOwner gate handlers and server components.
 */
import type { Profile } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail, parseOwnerEmails } from "@/lib/auth/owner-email";

export type AuthResult =
  { ok: true; profile: Profile } | { ok: false; status: 401 | 403 };

export async function getOrCreateProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const shouldOwn = isOwnerEmail(
    user.email,
    parseOwnerEmails(process.env.OWNER_EMAILS),
  );

  return prisma.profile.upsert({
    where: { id: user.id },
    update: shouldOwn
      ? { email: user.email, role: Role.owner }
      : { email: user.email },
    create: {
      id: user.id,
      email: user.email,
      role: shouldOwn ? Role.owner : Role.player,
    },
  });
}

export async function requireUser(): Promise<AuthResult> {
  const profile = await getOrCreateProfile();
  if (!profile) return { ok: false, status: 401 };
  return { ok: true, profile };
}

export async function requireOwner(): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (result.profile.role !== Role.owner) return { ok: false, status: 403 };
  return result;
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add src/lib/schemas/auth.ts src/lib/auth/profile.ts
git commit -m "feat: add profile lazy-upsert and auth guards"
```

---

## Task 5: Auth route handlers (signup / login / logout)

**Files:**

- Create: `src/app/api/auth/signup/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Interfaces:**

- Consumes: `createClient` (`@/lib/supabase/server`), `credentialsSchema`
  (`@/lib/schemas/auth`), `getOrCreateProfile` (`@/lib/auth/profile`).
- Produces: `POST /api/auth/signup`, `POST /api/auth/login`, `POST
/api/auth/logout`. Success → `{ ok: true }` (200); invalid body → 400; bad
  credentials → 401.

- [ ] **Step 1: Signup handler**

Create `src/app/api/auth/signup/route.ts`:

```ts
/**
 * Route handler: validate credentials, create the Supabase auth user, and
 * (email confirmation off) sign them in. The profile is upserted lazily on the
 * first authenticated request.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/schemas/auth";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await getOrCreateProfile();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Login handler**

Create `src/app/api/auth/login/route.ts`:

```ts
/**
 * Route handler: validate credentials and sign the user in via Supabase.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/schemas/auth";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await getOrCreateProfile();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Logout handler**

Create `src/app/api/auth/logout/route.ts`:

```ts
/**
 * Route handler: sign the current user out, clearing the session cookies.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck && npm run lint`

```bash
git add src/app/api/auth
git commit -m "feat: add signup, login, and logout route handlers"
```

---

## Task 6: Auth pages + landing / minimal authed home

**Files:**

- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/logout-button.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**

- Consumes: `createClient` (`@/lib/supabase/server`) for server-side auth checks;
  the auth route handlers via `fetch`.
- Produces: `/login`, `/signup` (redirect to `/` when already authenticated);
  `/` shows sign-in links when logged out and a minimal home + logout when
  logged in.

- [ ] **Step 1: Shared client credential form**

Create `src/app/login/page.tsx`:

```tsx
/**
 * Login page: client form posting to /api/auth/login, redirecting home on
 * success. Redirects to / when already authenticated (checked server-side is
 * handled by the home page; this page guards via a client check on mount).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setPending(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded border p-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded border p-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black p-2 text-white disabled:opacity-50"
        >
          Log in
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <a href="/signup" className="text-sm underline">
        Need an account? Sign up
      </a>
    </main>
  );
}
```

- [ ] **Step 2: Signup page**

Create `src/app/signup/page.tsx` — identical structure to Step 1, posting to
`/api/auth/signup`, heading "Sign up", button "Sign up", and the footer link
"Have an account? Log in" → `/login`:

```tsx
/**
 * Signup page: client form posting to /api/auth/signup, redirecting home on
 * success.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setPending(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Could not sign up. Use a valid email and 8+ char password.");
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded border p-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          className="rounded border p-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black p-2 text-white disabled:opacity-50"
        >
          Sign up
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <a href="/login" className="text-sm underline">
        Have an account? Log in
      </a>
    </main>
  );
}
```

- [ ] **Step 3: Logout button (client)**

Create `src/app/logout-button.tsx`:

```tsx
/**
 * Client button that posts to /api/auth/logout and refreshes to the logged-out
 * home.
 */
"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={onClick} className="rounded border px-3 py-1 text-sm">
      Log out
    </button>
  );
}
```

- [ ] **Step 4: Landing / minimal authed home**

Replace `src/app/page.tsx`:

```tsx
/**
 * Home: a minimal authed surface for milestone 1. Logged-out visitors get
 * sign-in / sign-up links; logged-in users see their email, role, an owner-only
 * link to the permissions page, and a logout button. The full tournament home
 * lands in later milestones.
 */
import { getOrCreateProfile } from "@/lib/auth/profile";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const profile = await getOrCreateProfile();

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Jumbo Minigames</h1>
      {profile ? (
        <div className="flex flex-col gap-3">
          <p>
            Signed in as {profile.email} ({profile.role}).
          </p>
          {profile.role === "owner" ? (
            <a href="/admin/permissions" className="underline">
              Manage permissions
            </a>
          ) : null}
          <LogoutButton />
        </div>
      ) : (
        <div className="flex gap-4">
          <a href="/login" className="underline">
            Log in
          </a>
          <a href="/signup" className="underline">
            Sign up
          </a>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify in the running app and commit**

Run: `npm run dev`, then in the browser: sign up a throwaway user, confirm the
home shows the email + role, log out, log back in.
Run: `npm run typecheck && npm run lint && npm run format:check`

```bash
git add src/app/login/page.tsx src/app/signup/page.tsx src/app/logout-button.tsx src/app/page.tsx
git commit -m "feat: add login, signup, and authed home pages"
```

---

## Task 7: Owner permissions page + admin route handlers

**Files:**

- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/role/route.ts`
- Create: `src/app/admin/permissions/page.tsx`
- Create: `src/app/admin/permissions/role-toggle.tsx`

**Interfaces:**

- Consumes: `requireOwner` (`@/lib/auth/profile`), `roleChangeSchema`
  (`@/lib/schemas/auth`), `prisma` (`@/lib/prisma`), `Role`
  (`@/generated/prisma/client`).
- Produces: `GET /api/admin/users` → `{ users: { id, email, role }[] }`;
  `PATCH /api/admin/users/[id]/role` with body `{ role: "player" | "admin" }`.

- [ ] **Step 1: List handler (owner-only)**

Create `src/app/api/admin/users/route.ts`:

```ts
/**
 * Route handler: list all profiles for the owner permissions page. Owner-only,
 * enforced server-side.
 */
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const users = await prisma.profile.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ users });
}
```

- [ ] **Step 2: Role-change handler (owner-only, async params)**

Create `src/app/api/admin/users/[id]/role/route.ts`:

```ts
/**
 * Route handler: set a user's role to player or admin. Owner-only. Owner rows
 * are immutable (owner is env-driven) and the owner cannot change their own row.
 */
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/profile";
import { roleChangeSchema } from "@/lib/schemas/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id } = await ctx.params;
  if (id === auth.profile.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const parsed = roleChangeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "No such user" }, { status: 404 });
  }
  if (target.role === Role.owner) {
    return NextResponse.json(
      { error: "Owner role is not editable" },
      { status: 400 },
    );
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ user: updated });
}
```

- [ ] **Step 3: Role toggle (client)**

Create `src/app/admin/permissions/role-toggle.tsx`:

```tsx
/**
 * Client control to flip a user between player and admin via the PATCH handler.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; role: "player" | "admin" };

export function RoleToggle({ id, role }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const next = role === "admin" ? "player" : "admin";

  async function onClick() {
    setPending(true);
    await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded border px-2 py-1 text-sm disabled:opacity-50"
    >
      Make {next}
    </button>
  );
}
```

- [ ] **Step 4: Permissions page (owner-gated server component)**

Create `src/app/admin/permissions/page.tsx`:

```tsx
/**
 * Owner-only permissions page: lists users and toggles player/admin. Owner rows
 * are shown without a toggle. Authorization is enforced here and in the handlers.
 */
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { RoleToggle } from "./role-toggle";

export default async function PermissionsPage() {
  const auth = await requireOwner();
  if (!auth.ok) redirect("/");

  const users = await prisma.profile.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Permissions</h1>
      <ul className="flex flex-col divide-y">
        {users.map((user) => (
          <li key={user.id} className="flex items-center justify-between py-2">
            <span>
              {user.email} — {user.role}
            </span>
            {user.role === "owner" ? null : (
              <RoleToggle id={user.id} role={user.role} />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: Verify as owner and commit**

Add your email to `OWNER_EMAILS` in `.env.local`, sign up/in as that user, and a
second throwaway user. As owner, visit `/admin/permissions`, toggle the second
user player↔admin (confirm it persists on refresh), and confirm a non-owner is
redirected from `/admin/permissions`.
Run: `npm run typecheck && npm run lint && npm run format:check`

```bash
git add src/app/api/admin src/app/admin
git commit -m "feat: add owner permissions page and admin role handlers"
```

---

## Task 8: Playwright auth E2E + test-env wiring

**Files:**

- Modify: `playwright.config.ts`
- Create: `e2e/auth.spec.ts`
- Modify: `e2e/smoke.spec.ts`

**Prerequisite (environment):** Email confirmation must be OFF in the test
Supabase project. The Supabase CLI is logged into the Tufts account that owns the
test project — disable it via the management API for that project. The production
project is maintainer-controlled (handoff in Task 9). Without this, signup does
not complete a session and the E2E will fail.

**Interfaces:**

- Consumes: the running app and the auth pages/handlers from Tasks 5–6.

- [ ] **Step 1: Load test env in the Playwright config**

In `playwright.config.ts`, add at the top (below the header comment) so local
runs target the **test** project and CI uses its injected job env:

```ts
import { config as loadEnv } from "dotenv";

// Local runs read the test-project credentials; in CI these come from the job
// env (the file is absent) and this call is a harmless no-op.
loadEnv({ path: ".env.test.local" });
```

Keep the rest of the config. The `webServer` child inherits this process env, and
Next does not override already-set env vars, so `next build && next start` uses
the test project.

- [ ] **Step 2: Update the smoke test for the new landing**

Replace `e2e/smoke.spec.ts` body so it asserts the logged-out home renders its
sign-in link (the landing no longer shows the scaffold):

```ts
/**
 * Smoke test: the app builds, serves, and renders the logged-out home with a
 * login link. Auth flow coverage lives in auth.spec.ts.
 */
import { test, expect } from "@playwright/test";

test("logged-out home renders a login link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});
```

- [ ] **Step 3: Write the auth E2E spec**

Create `e2e/auth.spec.ts`:

```ts
/**
 * Auth E2E (graded flow): sign up with a unique email lands authenticated;
 * logout returns to the login link; login with the same credentials
 * re-authenticates. Runs against the dedicated test Supabase project.
 */
import { test, expect } from "@playwright/test";

test("signup, logout, and login", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(
    page.getByText(new RegExp(`Signed in as ${email}`)),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByText(new RegExp(`Signed in as ${email}`)),
  ).toBeVisible();
});
```

- [ ] **Step 4: Run the suite locally against the test project**

Run: `npm run test:e2e`
Expected: both specs PASS. (First run builds; the test project already has the
migration from Task 2, and email confirmation is off.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/auth.spec.ts e2e/smoke.spec.ts
git commit -m "test: add auth E2E spec and target the test Supabase project"
```

---

## Task 9: Docs, ROADMAP flip, PR, deploy verification

**Files:**

- Modify: `docs/ROADMAP.md` (milestone 1 → done)
- Modify: `README.md` (migration command note, if changed)
- Modify: `.env.example` (only if a variable was added — none expected)

- [ ] **Step 1: Flip the roadmap**

In `docs/ROADMAP.md`, change milestone 1's Status from `pending` to `done`, and
update the `Last reviewed` footer date.

- [ ] **Step 2: README migration note**

In `README.md` "Getting started", ensure the setup block reflects the new
scripts: `npm run db:migrate` (dev, targets the test project) and that
`npx prisma generate` runs automatically via `postinstall`. Keep it to the two
changed lines.

- [ ] **Step 3: Full local gate run**

Run:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test:unit && npm run test:e2e
```

Expected: all green.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feature/auth-and-roles
```

Open a PR into `main` with the template filled honestly (Affected roles: all;
API/DB sections completed — the migration and the auth/admin endpoints;
screenshots of login, home, and the permissions page). Do **not** add any
attribution trailer to the PR body.

- [ ] **Step 5: CI green**

Confirm the CI job passes: `npm ci` (runs `postinstall` → `prisma generate`),
`typecheck`, `lint`, `format:check`, `prisma migrate deploy` (test DB), and
`test:e2e`.

- [ ] **Step 6: Maintainer handoff (production)**

Provide the maintainer with two production-only steps they must run (CLI is on
the Tufts/test account, so these cannot be done here):

1. Disable email confirmation in the **production** Supabase project (Auth →
   Sign In / Up → Email).
2. Apply the migration to production: with production `.env.local` present, run
   `npx prisma migrate deploy`.
   Also set `OWNER_EMAILS` in Vercel project env (production) and redeploy.

- [ ] **Step 7: Merge, delete branch, verify live**

After approval and green CI, squash-merge, delete the branch, and verify the
deployed flow on the live Vercel URL: sign up, see role, log out, log in; owner
reaches `/admin/permissions`. Confirm ROADMAP shows milestone 1 done on `main`.

---

## Self-review

**Spec coverage:**

- Supabase email/password auth via `@supabase/ssr` (App Router): Tasks 3, 5, 6. ✓
- Signup/login/logout + redirect-if-authenticated: Tasks 5, 6. ✓
- First Prisma migration, `profiles` + `Role` (player/admin/owner): Task 2. ✓
- `OWNER_EMAILS` grants owner at signup: Tasks 1, 4 (lazy upsert). ✓
- Owner-only permissions page, list + promote/demote, authorization in handler:
  Task 7. ✓
- RLS deny-all defense in depth: Task 2 Step 4. ✓
- Owner env-only, immutable in UI; toggle player↔admin: Tasks 4, 7. ✓
- Playwright auth E2E in `e2e/`, green in CI against test project: Tasks 2 (CI
  migrate), 8. ✓
- Lazy server-side upsert decision: Task 4. ✓
- DoD (gates, ROADMAP flip same PR, merge/delete, live verify): Task 9. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; the one
"identical structure" reference (Task 6 Step 2) still includes the complete file.

**Type consistency:** `getOrCreateProfile`, `requireUser`, `requireOwner`,
`AuthResult`, `credentialsSchema`, `roleChangeSchema`, `parseOwnerEmails`,
`isOwnerEmail`, `prisma`, `createClient`, `Role` are used with consistent
signatures across tasks. Route `params` typed as `Promise<{ id: string }>` per
Next 16.
