/**
 * E2E support: a fixed cast of reusable accounts, authenticated once per worker
 * and replayed into every browser context via Playwright storage state.
 *
 * The suite used to sign a throwaway account up per browser context — 57
 * sign-ups inside one six-minute run from a single IP. The test Supabase
 * project accepts thirty sign-ups per five minutes per IP (measured against it
 * directly: the thirty-first returns `over_request_rate_limit`), so whichever
 * specs sorted last failed on an opaque 400 from the signup route. Sign-ins
 * are a separate bucket of the same size, which is why swapping signup for
 * login would not have helped on its own. Reusing personas takes the per-run
 * cost down to one sign-in per persona a worker actually touches, and to
 * nothing at all on a re-run inside SESSION_TTL_MS.
 *
 * Two rules hold this together and both are load-bearing:
 *
 * 1. **Roles are set here, never by a spec.** A shared account promoted by one
 *    test would stay an admin for every later one — silently inverting
 *    authz.spec, whose job is proving a non-admin is refused. `admin` is the
 *    only persona that ever holds the role, and every other persona is reset to
 *    `player` on each use.
 * 2. **Accounts are per worker.** `fullyParallel` runs specs concurrently
 *    locally (CI uses one worker and would hide this), so two tests would
 *    otherwise drive one account into two games at once — enough to make
 *    home's rejoin, which resolves to the account's most recent live game,
 *    point at the wrong one.
 *
 * Sign-up still happens through the real form, but only the first time a
 * persona is ever seen by the project; from then on it is a sign-in. auth.spec
 * deliberately keeps its own throwaway signups — that flow is the graded
 * coverage.
 */
import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

/** Shared by every persona; matches the password auth.spec signs up with. */
const PASSWORD = "password1234";

const AUTH_DIR = path.join("playwright", ".auth");

/**
 * How long a saved storage state is trusted before the persona is signed in
 * again. Supabase access tokens last an hour and @supabase/ssr rotates the
 * refresh token when it renews one — a rotation that would strand every other
 * context still holding the old cookie — so the window stays comfortably
 * inside the access token's life and no refresh is ever needed.
 */
const SESSION_TTL_MS = 30 * 60 * 1000;

type Role = "player" | "admin" | "owner";

interface PersonaSpec {
  displayName: string;
  role: Role;
  /**
   * Owner standing comes from the OWNER_EMAILS allowlist rather than a column,
   * so the owner cannot be worker-scoped: there is exactly one such address.
   * The specs that use it only read admin surfaces or write uniquely-named
   * rows, so sharing it across workers is safe.
   */
  fixedEmail?: string;
}

/**
 * The cast. Display names are asserted on screen by the specs (a roster entry,
 * a kick dialog), so they are part of the contract and each one is distinct —
 * a duplicate would make a `getByText` match the wrong player.
 */
const PERSONAS = {
  admin: { displayName: "Ada", role: "admin" },
  host: { displayName: "Hedy", role: "player" },
  p1: { displayName: "Grace", role: "player" },
  p2: { displayName: "Ivy", role: "player" },
  p3: { displayName: "Nora", role: "player" },
  p4: { displayName: "Mia", role: "player" },
  owner: {
    displayName: "Owner",
    role: "owner",
    fixedEmail: "owner@test.example.com",
  },
} as const satisfies Record<string, PersonaSpec>;

export type PersonaName = keyof typeof PERSONAS;

/** Widens the literal entry to the shared shape, so optional keys read. */
function specFor(name: PersonaName): PersonaSpec {
  return PERSONAS[name];
}

/** A persona signed in inside a browser context of their own. */
export interface SignedInPersona {
  context: BrowserContext;
  page: Page;
  email: string;
  displayName: string;
}

/** Opens a fresh browser context for `name`, already signed in and on home. */
export type SignIn = (name: PersonaName) => Promise<SignedInPersona>;

interface PersonaAccount {
  email: string;
  displayName: string;
  storageStatePath: string;
}

function emailFor(name: PersonaName, workerIndex: number): string {
  return (
    specFor(name).fixedEmail ?? `e2e-w${workerIndex}-${name}@test.example.com`
  );
}

/**
 * Forces the persona's role to what the cast declares, and reads it back. The
 * write is what keeps a run deterministic; the read-back is what makes a
 * database that refuses the change fail here rather than as an inverted
 * security assertion three specs later. Owner is left alone — it is derived
 * from OWNER_EMAILS on every authenticated request, so writing it would be
 * overwritten anyway.
 */
async function enforceRole(email: string, role: Role): Promise<void> {
  if (role === "owner") return;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("UPDATE profiles SET role = $2 WHERE email = $1", [
      email,
      role,
    ]);
    const { rows } = await client.query<{ role: string }>(
      "SELECT role FROM profiles WHERE email = $1",
      [email],
    );
    const actual = rows[0]?.role;
    if (actual !== role) {
      throw new Error(
        `Persona ${email} must hold role ${role} but the database reports ${actual ?? "no profile"}`,
      );
    }
  } finally {
    await client.end();
  }
}

async function isFresh(filePath: string): Promise<boolean> {
  try {
    const { mtimeMs } = await stat(filePath);
    return Date.now() - mtimeMs < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Signs the persona in through the real login form, signing them up first if
 * the project has never seen them. The signup branch runs once per persona per
 * Supabase project rather than once per run, which is what keeps the sign-up
 * rate limit clear for auth.spec.
 */
async function authenticate(
  page: Page,
  email: string,
  displayName: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  const signedIn = page.getByText(`Signed in as ${email}`);
  const loginError = page.getByText("Invalid email or password.");
  await expect(signedIn.or(loginError)).toBeVisible();

  if (await loginError.isVisible().catch(() => false)) {
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Display name").fill(displayName);
    await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
    await page.getByPlaceholder("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
  }

  await expect(signedIn).toBeVisible();
}

async function provision(
  browser: Browser,
  name: PersonaName,
  workerIndex: number,
): Promise<PersonaAccount> {
  const spec = specFor(name);
  const email = emailFor(name, workerIndex);
  const storageStatePath = path.join(AUTH_DIR, `w${workerIndex}-${name}.json`);

  if (!(await isFresh(storageStatePath))) {
    await mkdir(AUTH_DIR, { recursive: true });
    const context = await browser.newContext();
    try {
      await authenticate(await context.newPage(), email, spec.displayName);
      await context.storageState({ path: storageStatePath });
    } finally {
      await context.close();
    }
  }

  await enforceRole(email, spec.role);
  return { email, displayName: spec.displayName, storageStatePath };
}

interface WorkerFixtures {
  personaAccounts: (name: PersonaName) => Promise<PersonaAccount>;
}

interface TestFixtures {
  signedIn: SignIn;
}

/**
 * `signedIn` hands a spec a browser context already carrying the persona's
 * session, in place of the signup flow every spec used to inline. Contexts are
 * closed for the spec, so the per-test teardown the old helpers needed goes
 * away with them.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // `provide` is Playwright's fixture-value callback, conventionally named
  // `use`; the React hooks lint rule claims that name for itself.
  personaAccounts: [
    async ({ browser }, provide, workerInfo) => {
      const pending = new Map<PersonaName, Promise<PersonaAccount>>();
      await provide((name) => {
        const existing = pending.get(name);
        if (existing) return existing;
        const created = provision(browser, name, workerInfo.workerIndex);
        pending.set(name, created);
        return created;
      });
    },
    { scope: "worker" },
  ],

  signedIn: async ({ browser, personaAccounts }, provide) => {
    const opened: BrowserContext[] = [];
    await provide(async (name) => {
      const account = await personaAccounts(name);
      const context = await browser.newContext({
        storageState: account.storageStatePath,
      });
      opened.push(context);
      const page = await context.newPage();
      await page.goto("/");
      // A storage state that has quietly expired would otherwise surface as a
      // redirect to /login several steps later, wearing the failure of
      // whatever the spec was actually doing.
      await expect(
        page.getByText(`Signed in as ${account.email}`),
        `persona ${name} did not restore a session — delete playwright/.auth/ and re-run`,
      ).toBeVisible();
      return {
        context,
        page,
        email: account.email,
        displayName: account.displayName,
      };
    });
    for (const context of opened) await context.close();
  },
});

export { expect };
