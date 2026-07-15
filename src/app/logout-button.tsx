/**
 * Client button that posts to /api/auth/logout and refreshes to the logged-out
 * home.
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={onClick}>
      Log out
    </Button>
  );
}
