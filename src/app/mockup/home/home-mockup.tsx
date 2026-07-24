/**
 * Home rework mockup: join-code entry as the hero card, carrying the rejoin
 * row when mid-game and "Create a game" as its centered closing action, plus
 * the identity card with role-gated admin chrome — question bank for admins,
 * permissions for owners. Debug panel drives role, membership, and join
 * failure.
 */
"use client";

import { useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  Button,
  Card,
  CodeInput,
  Select,
  SlamWipe,
  Spinner,
  Toggle,
} from "@jumbo/ui";

const CODE_LENGTH = 6;
const FAKE_JOIN_MS = 700;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];

type Role = "player" | "admin" | "owner";
const ROLES = ["player", "admin", "owner"] as const;

function ChromeLink({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="slip cursor-pointer text-sec font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
    >
      {children}
    </button>
  );
}

function JoinCard({
  inGame,
  failJoins,
  onJoined,
}: {
  inGame: boolean;
  failJoins: boolean;
  onJoined: () => void;
}): React.JSX.Element {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shakes, setShakes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const submit = (value: string) => {
    if (pending || value.length < CODE_LENGTH) return;
    setError(null);
    setPending(true);
    timer.current = setTimeout(() => {
      setPending(false);
      if (failJoins) {
        setError("No game with that code.");
        setShakes((n) => n + 1);
        return;
      }
      onJoined();
    }, FAKE_JOIN_MS);
  };

  return (
    <Card className="p-6">
      <motion.div
        key={shakes}
        animate={shakes > 0 ? { x: SHAKE_KEYFRAMES } : undefined}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4"
      >
        <h2 className="font-display text-xl uppercase text-s12">Join a game</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(code);
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
          {error && <p className="text-meta font-bold text-crit">{error}</p>}
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
        {inGame && (
          <div className="flex items-center justify-between gap-3 border-t-2 border-s6 pt-4">
            <span className="min-w-0 truncate text-sec text-s9">
              You’re in Thursday hacknight.
            </span>
            <Button variant="outline" onClick={onJoined}>
              Rejoin
            </Button>
          </div>
        )}
        <div className="flex justify-center border-t-2 border-s6 pt-4">
          <Button variant="outline">Create a game</Button>
        </div>
      </motion.div>
    </Card>
  );
}

export function HomeMockup(): React.JSX.Element {
  const [role, setRole] = useState<Role>("player");
  const [inGame, setInGame] = useState(false);
  const [failJoins, setFailJoins] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [wipe, setWipe] = useState<"in" | "out" | null>(null);
  const [landed, setLanded] = useState(false);

  const reset = () => {
    setWipe(null);
    setLanded(false);
    setResetKey((n) => n + 1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-s1">
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-8">
          <span className="text-meta font-bold uppercase tracking-widest text-s7">
            Mockup · home
          </span>
          {landed && wipe === null ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <span className="text-meta font-bold uppercase tracking-widest text-s7">
                Joins land in /t/[id]
              </span>
              <Button variant="outline" onClick={reset}>
                Back to home
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <p className="font-display text-3xl uppercase text-s12">
                  Jumbo <span className="text-accent">minigames</span>
                </p>
                <p className="text-sec text-s9">
                  Short co-op minigames, team vs team.
                </p>
              </div>

              <JoinCard
                key={`${resetKey}-${failJoins}-${inGame}`}
                inGame={inGame}
                failJoins={failJoins}
                onJoined={() => setWipe("in")}
              />

              <Card className="flex flex-col gap-4 p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body text-s11">
                    Signed in as jumbo@tufts.edu
                  </span>
                  <span className="text-caps uppercase tracking-[0.07em] text-s8">
                    {role}
                  </span>
                </div>
                <div className="flex items-center gap-4 border-t-2 border-s6 pt-4">
                  <ChromeLink>Log out</ChromeLink>
                  {(role === "admin" || role === "owner") && (
                    <ChromeLink>Question bank</ChromeLink>
                  )}
                  {role === "owner" && (
                    <ChromeLink>Manage permissions</ChromeLink>
                  )}
                </div>
              </Card>
            </>
          )}
        </main>

        {wipe !== null && (
          <SlamWipe
            phase={wipe}
            label="Thursday hacknight"
            onCovered={() => {
              setLanded(true);
              setWipe("out");
            }}
            onUncovered={() => setWipe(null)}
          />
        )}

        <Card className="fixed bottom-4 left-4 z-(--z-sticky) flex w-64 flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-s10">
            Role
            <Select
              options={ROLES}
              value={role}
              onChange={(v) => setRole(v as Role)}
              aria-label="Role"
            />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            In a game
            <Toggle on={inGame} onChange={setInGame} aria-label="In a game" />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            Fail joins
            <Toggle
              on={failJoins}
              onChange={setFailJoins}
              aria-label="Fail joins"
            />
          </label>
          <Button onClick={reset}>Reset</Button>
        </Card>
      </div>
    </MotionConfig>
  );
}
