/**
 * Home: the authenticated landing. Everyone gets a join-by-code entry; admins
 * and owners also get a host control. Shows the signed-in identity and an
 * owner-only link to permissions. Logged-out visitors are sent to login.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@jumbo/ui";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { LogoutButton } from "./logout-button";
import { JoinForm } from "./join-form";
import { HostForm } from "./host-form";

export default async function Home() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login");

  const canHost = profile.role === "admin" || profile.role === "owner";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Jumbo <span className="text-accent">minigames</span>
        </p>
        <p className="text-sec text-s9">Team tournament of co-op minigames.</p>
      </div>

      <JoinForm />
      {canHost ? <HostForm /> : null}

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body text-s11">
            Signed in as {profile.email}
          </span>
          <span className="text-caps uppercase tracking-[0.07em] text-s8">
            {profile.role}
          </span>
        </div>
        <div className="flex items-center gap-4 border-t-2 border-s6 pt-4">
          <LogoutButton />
          {profile.role === "owner" ? (
            <Link
              href="/admin/permissions"
              className="slip text-sec font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
            >
              Manage permissions
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
