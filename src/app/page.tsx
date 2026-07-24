/**
 * Home: the authenticated landing. One hero card takes a game code and joins;
 * admins and owners also get a route into hosting. A small identity card shows
 * the signed-in account, log out, an owner-only permissions link, and a
 * question-bank link for admins and owners. Logged-out visitors are sent to
 * login.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@jumbo/ui";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { findCurrentTournament } from "@/lib/tournament/current";
import { LogoutButton } from "./logout-button";
import { JoinForm } from "./join-form";
import { CreateTournamentButton } from "./create-tournament-button";
import { RejoinButton } from "./rejoin-button";

export default async function Home() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login");

  const canHost = profile.role === "admin" || profile.role === "owner";
  const current = await findCurrentTournament(profile.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Jumbo <span className="text-accent">minigames</span>
        </p>
        <p className="text-sec text-s9">Team tournament of co-op minigames.</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl uppercase text-s12">Join a game</h2>
        <JoinForm />
        {current ? (
          <div className="flex items-center justify-between gap-3 border-t-2 border-s6 pt-4">
            <span className="min-w-0 truncate text-sec text-s9">
              You&rsquo;re in {current.name}.
            </span>
            <RejoinButton tournamentId={current.id} />
          </div>
        ) : canHost ? (
          <div className="flex items-center gap-3 border-t-2 border-s6 pt-4">
            <span className="text-sec text-s9">Running the tournament?</span>
            <CreateTournamentButton />
          </div>
        ) : null}
      </Card>

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
          {profile.role !== "player" ? (
            <Link
              href="/admin/questions"
              className="slip text-sec font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
            >
              Question bank
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
