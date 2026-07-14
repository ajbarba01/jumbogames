/**
 * Client control to flip a user between player and admin via the PATCH handler.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleChange } from "@/lib/schemas/auth";

type Props = { id: string; role: RoleChange["role"] };

export function RoleToggle({ id, role }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = role === "admin" ? "player" : "admin";

  async function onClick() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError("Could not change role");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded border px-2 py-1 text-sm disabled:opacity-50"
      >
        Make {next}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
