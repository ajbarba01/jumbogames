/**
 * Create-game surface: any signed-in user names a game, picks its minigame
 * pool and how many minigames each match plays, then lands in the new lobby.
 * The picker is fed from the registry, so a minigame registered later appears
 * here with its own copy and no edit to this file.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { MINIGAMES, poolFor } from "@jumbo/engine";
import { eligibleEnv } from "@jumbo/engine";
import { CreateForm } from "./create-form";

export default async function CreatePage() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login");
  // No role check: hosting is a per-game role held by the creator (M7).

  // Text only: the emblem is a client component and the form looks it up from
  // the client registry itself, which keeps this server component free of it.
  const available = poolFor(eligibleEnv()).map((kind) => ({
    kind,
    title: MINIGAMES[kind].title,
    tagline: MINIGAMES[kind].tagline,
  }));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Create a <span className="text-accent">game</span>
        </p>
        <p className="text-sec text-s9">
          Spin up a lobby and share the code with the room.
        </p>
      </div>

      <CreateForm available={available} />

      <Link
        href="/"
        className="slip text-sec self-center font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
