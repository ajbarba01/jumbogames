/**
 * Home join control: a player enters a game code, which resolves to a lobby.
 * On success it routes into that tournament's lobby; a bad or closed code
 * reports inline.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField } from "@jumbo/ui";

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/tournaments/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (res.ok && data?.tournamentId) {
      router.push(`/t/${data.tournamentId}`);
    } else {
      setError(data?.error ?? "Could not join. Try again.");
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl uppercase text-s12">Join a game</h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <TextField
          name="code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          placeholder="Game code"
          autoComplete="off"
          autoCapitalize="characters"
          invalid={error !== null}
          aria-invalid={error !== null}
          aria-describedby={error ? "join-error" : undefined}
        />
        {error ? (
          <p id="join-error" className="text-meta text-crit">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          disabled={pending || code.trim() === ""}
        >
          Join
        </Button>
      </form>
    </Card>
  );
}
