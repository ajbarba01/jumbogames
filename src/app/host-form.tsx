/**
 * Home host control (admins and owners): names a tournament, picks how many
 * minigames each match plays, and creates it — routing the host straight into
 * the new lobby.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select, TextField } from "@jumbo/ui";

const MINIGAME_OPTIONS = ["1", "2", "3", "4"] as const;

export function HostForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [minigames, setMinigames] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        minigamesPerMatch: Number(minigames),
      }),
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (res.ok && data?.tournament?.id) {
      router.push(`/t/${data.tournament.id}`);
    } else {
      setError(data?.error ?? "Could not create the tournament.");
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl uppercase text-s12">
        Host a tournament
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <TextField
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          placeholder="Tournament name"
          invalid={error !== null}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sec text-s10">Minigames per match</span>
          <Select
            options={MINIGAME_OPTIONS}
            value={minigames}
            onChange={setMinigames}
          />
        </div>
        {error ? <p className="text-meta text-crit">{error}</p> : null}
        <Button
          type="submit"
          variant="primary"
          disabled={pending || name.trim() === ""}
        >
          Create and host
        </Button>
      </form>
    </Card>
  );
}
