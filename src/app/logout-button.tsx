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
