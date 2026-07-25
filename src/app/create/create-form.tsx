/**
 * Create-game form: name, minigame pool, and minigames-per-match, posted to
 * the create route and followed by a slam wipe into the new lobby. Validation
 * blocks submit with a shake rather than a silent no-op, so an empty name or
 * an empty pool is visible.
 */
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Button,
  Card,
  Field,
  OptionCard,
  Spinner,
  StepSlider,
  TextField,
  cx,
} from "@jumbo/ui";
import type { MinigameKind } from "@/generated/prisma/client";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";

const K_STOPS = ["1", "2", "3", "4"] as const;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];

export interface AvailableMinigame {
  kind: MinigameKind;
  title: string;
  instructions: string;
}

export function CreateForm({
  available,
}: {
  available: AvailableMinigame[];
}): React.JSX.Element {
  const { navigate } = useWipeNav();
  const soloKind = available.length === 1 ? available[0].kind : null;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<MinigameKind[]>(
    soloKind ? [soloKind] : [],
  );
  const [k, setK] = useState<(typeof K_STOPS)[number]>("1");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakes, setShakes] = useState(0);

  const nameMissing = name.trim() === "";
  const poolEmpty = selected.length === 0;
  const nothingAvailable = available.length === 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nameMissing || poolEmpty) {
      setTouched(true);
      setShakes((n) => n + 1);
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        minigamesPerMatch: Number(k),
        pool: selected,
      }),
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (res.ok && data?.tournament?.id) {
      navigate(`/t/${data.tournament.id}`);
    } else {
      setError(data?.error ?? "Could not create the game.");
      setShakes((n) => n + 1);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <motion.form
        key={shakes}
        onSubmit={onSubmit}
        noValidate
        animate={shakes > 0 ? { x: SHAKE_KEYFRAMES } : undefined}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-6"
      >
        <Field
          label="Name"
          error={touched && nameMissing ? "Required" : undefined}
        >
          <TextField
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Thursday hacknight"
            invalid={touched && nameMissing}
            disabled={pending || nothingAvailable}
          />
        </Field>

        <Field
          label="Minigames"
          detail={
            nothingAvailable
              ? undefined
              : `${selected.length} of ${available.length} picked`
          }
          error={
            touched && poolEmpty && !nothingAvailable
              ? "Pick at least one minigame."
              : undefined
          }
        >
          {nothingAvailable ? (
            <p className="text-sec text-s9">No minigames available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {available.map((game) => (
                <OptionCard
                  key={game.kind}
                  title={game.title}
                  description={game.instructions}
                  selected={selected.includes(game.kind)}
                  disabled={pending}
                  onToggle={() =>
                    setSelected((prev) =>
                      prev.includes(game.kind)
                        ? prev.filter((g) => g !== game.kind)
                        : [...prev, game.kind],
                    )
                  }
                />
              ))}
            </div>
          )}
        </Field>

        <Field
          label="Minigames per match"
          detail={k}
          helper="Repeats fill in if the pool is smaller."
        >
          <StepSlider
            stops={K_STOPS}
            value={k}
            onChange={setK}
            aria-label="Minigames per match"
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sec font-bold text-crit">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="block"
          disabled={pending || nothingAvailable}
          className={cx(
            pending && "inline-flex items-center justify-center gap-2",
          )}
        >
          {pending && <Spinner label="Creating" />}
          {pending ? "Creating…" : "Create game"}
        </Button>
      </motion.form>
    </Card>
  );
}
