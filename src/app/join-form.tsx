/**
 * Home join control: a player enters a game code into the segmented field,
 * which resolves to a lobby. A full code submits on its own; a bad or closed
 * code reports inline. Renders form-only — the home page owns the hero card.
 */
"use client";

import { useState } from "react";
import { Button, CodeInput } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";

// Mirrors JOIN_CODE_LENGTH; the server is the authority and re-validates.
const CODE_LENGTH = 6;

export function JoinForm() {
  const { navigate } = useWipeNav();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(value: string) {
    if (pending || value.length < CODE_LENGTH) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/tournaments/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: value }),
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (res.ok && data?.tournamentId) {
      navigate(`/t/${data.tournamentId}`);
    } else {
      setError(data?.error ?? "Could not join. Try again.");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <CodeInput
        aria-label="Game code"
        value={code}
        onChange={(value) => {
          setCode(value);
          setError(null);
        }}
        placeholder="JUMBOS"
        invalid={error !== null}
      />
      {error ? (
        <p id="join-error" className="text-meta text-crit">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        disabled={pending || code.length < CODE_LENGTH}
      >
        Join
      </Button>
    </form>
  );
}
