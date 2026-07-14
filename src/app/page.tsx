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
