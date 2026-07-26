/**
 * Home: the authenticated landing. A game-code hero card takes the code and
 * joins, with "Create a game" shown to every signed-in viewer. A small
 * identity card shows the signed-in account with an editable display name, log
 * out, an owner-only permissions link, and a question-bank link for admins and
 * owners. Logged-out visitors are sent to login.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@jumbo/ui";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { findCurrentTournament } from "@/lib/tournament/current";
import { LogoutButton } from "./logout-button";
import { JoinCard } from "./join-card";
import { DisplayNameEditor } from "./display-name-editor";

export default async function Home() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login");

  const current = await findCurrentTournament(profile.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Jumbo <span className="text-accent">minigames</span>
        </p>
        <p className="text-sec text-s9">Short co-op minigames, team vs team.</p>
      </div>

      <JoinCard
        current={current ? { id: current.id, name: current.name } : null}
      />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <DisplayNameEditor initialName={profile.displayName} />
          <span className="shrink-0 text-caps uppercase tracking-[0.07em] text-s8">
            {profile.role}
          </span>
        </div>
        {/* A long address has no break opportunity, so it overflows the card
            as inline text at the floor width — wrap it anywhere it must. */}
        <span className="text-sec wrap-anywhere text-s9">
          Signed in as {profile.email}
        </span>
        {/* Up to three peer links for an owner — more than fits a phone in one
            line, and peers of equal weight, so the row wraps (docs/UI.md). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-s6 pt-4">
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
