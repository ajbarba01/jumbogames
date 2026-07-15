/**
 * Owner-only permissions page: lists users and toggles player/admin. Owner rows
 * are shown without a toggle. Authorization is enforced here and in the handlers.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner, listProfiles } from "@/lib/auth/profile";
import { RoleToggle } from "./role-toggle";

export default async function PermissionsPage() {
  const auth = await requireOwner();
  if (!auth.ok) redirect("/");

  const users = await listProfiles();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="slip text-meta font-bold uppercase tracking-widest text-s7 hover:text-s10"
        >
          ← Back to home
        </Link>
        <h1 className="font-display text-2xl uppercase text-s12">
          Permissions
        </h1>
        <p className="text-sec text-s9">
          Grant or revoke admin access. Owners can’t be changed.
        </p>
      </div>

      <div className="overflow-hidden border-2 border-s6 bg-s2">
        <div className="flex items-center justify-between border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
          <span>Member</span>
          <span>Role</span>
        </div>
        <ul className="divide-y-2 divide-s6">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sec text-s11">
                {user.email}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-caps uppercase tracking-[0.07em] text-s7">
                  {user.role}
                </span>
                {user.role === "owner" ? null : (
                  <RoleToggle id={user.id} role={user.role} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
