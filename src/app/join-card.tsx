/**
 * Home join hero: a signed-in viewer enters a game code to join; the card
 * shakes on a rejected code (the register's form-error affordance, SLIP_SHAKE).
 * Carries the rejoin row when the viewer is already in a game, and a
 * "Create a game" action shown to everyone. The server re-validates the code,
 * and the code it returns rides the link so the game page can offer the writes
 * that need it (DESIGN decision 16: link = read, code = write).
 */
"use client";

import { useState } from "react";
import { motion, MotionConfig, useAnimationControls } from "motion/react";
import { Button, Card, CodeInput, SLIP_SHAKE, Spinner } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import { RejoinButton } from "./rejoin-button";
import { CreateTournamentButton } from "./create-tournament-button";

// Mirrors JOIN_CODE_LENGTH; the server is the authority and re-validates.
const CODE_LENGTH = 6;

export function JoinCard({
  current,
}: {
  current: { id: string; name: string } | null;
}) {
  const { navigate } = useWipeNav();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shakeControls = useAnimationControls();

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
    if (res.ok && data?.tournamentId) {
      navigate(`/t/${data.tournamentId}?c=${data.code}`);
      return;
    }
    setPending(false);
    setError(data?.error ?? "Could not join. Try again.");
    void shakeControls.start({ x: [...SLIP_SHAKE] });
  }

  return (
    <MotionConfig reducedMotion="user">
      <Card className="p-6">
        <motion.div
          animate={shakeControls}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4"
        >
          <h2 className="font-display text-xl uppercase text-s12">
            Join a game
          </h2>
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
              <p id="join-error" role="alert" className="text-meta text-crit">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={pending || code.length < CODE_LENGTH}
              className="inline-flex items-center justify-center gap-2"
            >
              {pending && <Spinner label="Joining" />}
              {pending ? "Joining…" : "Join"}
            </Button>
          </form>
          {current ? (
            <div className="flex items-center justify-between gap-3 border-t-2 border-s6 pt-4">
              <span className="min-w-0 truncate text-sec text-s9">
                You&rsquo;re in {current.name}.
              </span>
              <RejoinButton tournamentId={current.id} />
            </div>
          ) : null}
          <div className="flex justify-center border-t-2 border-s6 pt-4">
            <CreateTournamentButton />
          </div>
        </motion.div>
      </Card>
    </MotionConfig>
  );
}
