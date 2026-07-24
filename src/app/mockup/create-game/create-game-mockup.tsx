/**
 * Create-game mockup: one board-sticker card — required name, the minigame
 * pool as tappable sticker cards with check-glyph selection, two centered
 * K and max-teams steppers (K may exceed the pool — a short pool just repeats),
 * busy/error faces, and the slam wipe into a stubbed landing with the game
 * code huge.
 */
"use client";

import { useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  Button,
  Card,
  CopyCode,
  Select,
  SlamWipe,
  Spinner,
  TextField,
  Toggle,
  cx,
} from "@jumbo/ui";

const FAKE_CREATE_MS = 700;
const K_MAX = 4;
const TEAMS_MIN = 2;
const TEAMS_MAX = 15;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];
const FAKE_CODE = "H7K2QF";

interface MinigameInfo {
  kind: string;
  name: string;
  how: string;
}

const CATALOG: MinigameInfo[] = [
  {
    kind: "trivia",
    name: "Trivia tug-of-war",
    how: "Answer fast, pull the rope",
  },
  {
    kind: "typing",
    name: "Typing race",
    how: "The whole team types; combined pace wins",
  },
  {
    kind: "word",
    name: "Word territory",
    how: "Claim grid tiles; longer words steal them back",
  },
  {
    kind: "battleship",
    name: "Battleship",
    how: "Shared fleet, every player aims their own shots",
  },
];

type Availability = "trivia only" | "all four" | "none";
const AVAILABILITIES = ["trivia only", "all four", "none"] as const;

function kindsFor(availability: Availability): MinigameInfo[] {
  if (availability === "none") return [];
  if (availability === "trivia only") return CATALOG.slice(0, 1);
  return CATALOG;
}

function FieldLabel({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: string;
}): React.JSX.Element {
  return (
    <span className="text-caps font-bold uppercase tracking-widest text-s8">
      {children}
      {detail && <span className="text-s6"> · {detail}</span>}
    </span>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return <p className="text-meta font-bold text-crit">{children}</p>;
}

/** Composed numeric stepper — a kit-member gap; built from kit buttons here. */
function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
  helper,
  error,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  helper?: string;
  error?: string;
}): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col items-center gap-1 text-center"
    >
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          icon
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </Button>
        <output
          aria-live="polite"
          className="min-w-8 text-center font-display text-2xl text-s12"
        >
          {value}
        </output>
        <Button
          variant="outline"
          icon
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
      {/* Helper/error is width-capped so long copy wraps inside the column
          instead of widening the stepper and reflowing the pair to two rows. */}
      {error ? (
        <ErrorLine>{error}</ErrorLine>
      ) : helper ? (
        <p className="max-w-44 text-meta text-s7">{helper}</p>
      ) : null}
    </div>
  );
}

function PoolCard({
  game,
  selected,
  disabled,
  onToggle,
}: {
  game: MinigameInfo;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cx(
        "slip sticker sticker-hover sticker-press flex cursor-pointer items-start justify-between gap-2 rounded-r2 p-3 text-left",
        selected ? "bg-s4" : "bg-s2",
        disabled && "cursor-default opacity-60",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sec font-bold text-s12">{game.name}</span>
        <span className="text-meta text-s9">{game.how}</span>
      </span>
      <span
        aria-hidden
        className={cx("font-bold text-s12", selected ? "visible" : "invisible")}
      >
        ✓
      </span>
    </button>
  );
}

function CreateGameForm({
  available,
  failCreates,
  onCreated,
}: {
  available: MinigameInfo[];
  failCreates: boolean;
  onCreated: (name: string) => void;
}): React.JSX.Element {
  const soloKind = available.length === 1 ? available[0].kind : null;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(
    soloKind ? [soloKind] : [],
  );
  const [k, setK] = useState(1);
  const [maxTeams, setMaxTeams] = useState(TEAMS_MIN);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);
  const [shakes, setShakes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nameMissing = name.trim() === "";
  const poolEmpty = selected.length === 0;
  const nothingAvailable = available.length === 0;

  const submit = () => {
    if (nameMissing || poolEmpty) {
      setTouched(true);
      setShakes((n) => n + 1);
      return;
    }
    setBusy(true);
    setCreateFailed(false);
    timer.current = setTimeout(() => {
      if (failCreates) {
        setBusy(false);
        setCreateFailed(true);
        setShakes((n) => n + 1);
        return;
      }
      onCreated(name.trim());
    }, FAKE_CREATE_MS);
  };

  return (
    <Card className="rounded-r3 p-6">
      <motion.div
        key={shakes}
        animate={shakes > 0 ? { x: SHAKE_KEYFRAMES } : undefined}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-6"
      >
        <h1 className="font-display text-2xl uppercase text-s12">
          Create a game
        </h1>

        <label className="flex flex-col gap-1">
          <FieldLabel>Name</FieldLabel>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={touched && nameMissing}
            disabled={busy || nothingAvailable}
            placeholder="Thursday hacknight"
          />
          {touched && nameMissing && <ErrorLine>Required</ErrorLine>}
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel
            detail={
              nothingAvailable
                ? undefined
                : `${selected.length} of ${available.length} picked`
            }
          >
            Minigames
          </FieldLabel>
          {nothingAvailable ? (
            <p className="text-sec text-s9">No minigames available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {available.map((game) => (
                <PoolCard
                  key={game.kind}
                  game={game}
                  selected={selected.includes(game.kind)}
                  disabled={busy}
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
          {touched && poolEmpty && !nothingAvailable && (
            <ErrorLine>Pick at least one minigame.</ErrorLine>
          )}
        </div>

        <div className="grid grid-cols-2 items-start gap-8">
          <Stepper
            label="Minigames per match"
            value={k}
            min={1}
            max={K_MAX}
            onChange={setK}
            disabled={busy || nothingAvailable}
            helper="Repeats fill in if the pool is smaller."
          />
          <Stepper
            label="Max teams"
            value={maxTeams}
            min={TEAMS_MIN}
            max={TEAMS_MAX}
            onChange={setMaxTeams}
            disabled={busy || nothingAvailable}
            helper={
              maxTeams === TEAMS_MIN
                ? "A head-to-head pickup game."
                : "Runs as a round-robin tournament."
            }
          />
        </div>

        {createFailed && (
          <p className="text-sec font-bold text-crit">
            Couldn’t create the game — try again.
          </p>
        )}

        <Button
          variant="block"
          disabled={busy || nothingAvailable}
          onClick={submit}
          className={cx(
            busy && "inline-flex items-center justify-center gap-2",
          )}
        >
          {busy && <Spinner label="Creating" />}
          {busy ? "Creating…" : "Create game"}
        </Button>
      </motion.div>
    </Card>
  );
}

function CreatedLanding({
  name,
  onBack,
}: {
  name: string;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="text-meta font-bold uppercase tracking-widest text-s7">
        Mockup · the real flow lands in /t/[id]
      </span>
      <h1 className="font-display text-3xl uppercase text-s12">{name}</h1>
      <p className="text-sec text-s9">Share this code — teams join with it.</p>
      <CopyCode value={FAKE_CODE} className="text-4xl" />
      <Button variant="outline" onClick={onBack}>
        Back to the form
      </Button>
    </div>
  );
}

export function CreateGameMockup(): React.JSX.Element {
  const [availability, setAvailability] = useState<Availability>("all four");
  const [failCreates, setFailCreates] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [wipe, setWipe] = useState<"in" | "out" | null>(null);

  const reset = () => {
    setCreatedName(null);
    setWipe(null);
    setResetKey((n) => n + 1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-s1">
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-8">
          <span className="text-meta font-bold uppercase tracking-widest text-s7">
            Mockup · /create
          </span>
          {createdName !== null && wipe !== "in" ? (
            <CreatedLanding name={createdName} onBack={reset} />
          ) : (
            <CreateGameForm
              key={`${availability}-${resetKey}`}
              available={kindsFor(availability)}
              failCreates={failCreates}
              onCreated={(name) => {
                setCreatedName(name);
                setWipe("in");
              }}
            />
          )}
        </main>

        {wipe !== null && (
          <SlamWipe
            phase={wipe}
            label={createdName ?? undefined}
            onCovered={() => setWipe("out")}
            onUncovered={() => setWipe(null)}
          />
        )}

        <Card className="fixed bottom-4 left-4 z-(--z-sticky) flex w-64 flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-s10">
            Available games
            <Select
              options={AVAILABILITIES}
              value={availability}
              onChange={(v) => {
                setAvailability(v as Availability);
                reset();
              }}
              aria-label="Available games"
            />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            Fail creates
            <Toggle
              on={failCreates}
              onChange={setFailCreates}
              aria-label="Fail creates"
            />
          </label>
          <Button onClick={reset}>Reset</Button>
        </Card>
      </div>
    </MotionConfig>
  );
}
