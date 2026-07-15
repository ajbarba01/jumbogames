/**
 * Host: the admin-and-owner create surface. Names a tournament and picks how
 * many minigames each match plays, then routes the host into the new lobby.
 * Gated server-side — players are sent home, logged-out visitors to login.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { HostForm } from "../host-form";

export default async function HostPage() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login");
  if (profile.role === "player") redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Host a <span className="text-accent">tournament</span>
        </p>
        <p className="text-sec text-s9">
          Spin up a lobby and share the code with the room.
        </p>
      </div>

      <HostForm />

      <Link
        href="/"
        className="slip text-sec self-center font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
