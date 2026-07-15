/**
 * Client control to flip a user between player and admin via the PATCH handler.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";
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
      <Button variant="quiet" onClick={onClick} disabled={pending}>
        Make {next}
      </Button>
      {error ? <p className="text-sec text-crit">{error}</p> : null}
    </div>
  );
}
