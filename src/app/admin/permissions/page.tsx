/**
 * Owner-only permissions page: lists users and toggles player/admin. Owner rows
 * are shown without a toggle. Authorization is enforced here and in the handlers.
 */
import { redirect } from "next/navigation";
import { requireOwner, listProfiles } from "@/lib/auth/profile";
import { RoleToggle } from "./role-toggle";

export default async function PermissionsPage() {
  const auth = await requireOwner();
  if (!auth.ok) redirect("/");

  const users = await listProfiles();

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
