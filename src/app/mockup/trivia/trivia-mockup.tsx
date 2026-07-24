/**
 * Trivia tug-of-war mockup: full-screen player surface (rope + own free-pace
 * question stream + pop/shake answer feedback + the anonymized event log) and
 * the rope-centric full-screen spectator arena, over a local sim of the spec's
 * model — impulse per answer, exponential decay toward center, pin at |p| ≥ 1.
 * The leading team's color washes in from their wall as the knot nears the
 * pin. All tuning constants here are presentation stand-ins; the
 * authoritative values land with the M5 implementation.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  Button,
  Card,
  SLIP_DUR,
  SLIP_EASE,
  Select,
  Toggle,
  cx,
} from "@jumbo/ui";

const PLAY_SECONDS = 120;
const TICK_MS = 250;
const DECAY_HALF_LIFE_S = 10;
const IMPULSE_CORRECT = 0.14;
const IMPULSE_WRONG = IMPULSE_CORRECT / 3;
const FEEDBACK_MS = 1000;
const BOT_ANSWER_CHANCE_PER_TICK = 0.06;
const BOT_CORRECT_RATE = 0.6;
const TICKER_LENGTH = 4;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];

const TEAM_A = { name: "Rocketeers", colorIndex: 1 };
const TEAM_B = { name: "Segfaults", colorIndex: 2 };

type Role = "player" | "spectator";
const ROLES = ["player", "spectator"] as const;

type Phase = "playing" | "pinned-a" | "pinned-b" | "time";

interface MockQuestion {
  prompt: string;
  correct: string;
  wrong: [string, string, string];
}

const DECK: MockQuestion[] = [
  {
    prompt: "Which planet has the hottest surface temperature?",
    correct: "Venus",
    wrong: ["Mercury", "Mars", "Jupiter"],
  },
  {
    prompt: "Who wrote the novel Dune?",
    correct: "Frank Herbert",
    wrong: ["Isaac Asimov", "Arthur C. Clarke", "Ray Bradbury"],
  },
  {
    prompt: "What is the capital of New Zealand?",
    correct: "Wellington",
    wrong: ["Auckland", "Christchurch", "Hamilton"],
  },
  {
    prompt: "Which element has the chemical symbol Au?",
    correct: "Gold",
    wrong: ["Silver", "Argon", "Aluminium"],
  },
  {
    prompt: "How many hearts does an octopus have?",
    correct: "Three",
    wrong: ["One", "Two", "Four"],
  },
  {
    prompt: "Which band released the album OK Computer?",
    correct: "Radiohead",
    wrong: ["Blur", "Oasis", "Pulp"],
  },
];

interface TickerEvent {
  id: number;
  team: "A" | "B";
  delta: number;
}

/** FNV-1a hash of a string to a 32-bit seed. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates shuffle over a mulberry32 PRNG. Seeded from the question so
 *  the answer order is deterministic — the same on the server and the client,
 *  so the choices never trigger a hydration mismatch. */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const next = [...items];
  let state = seed || 1;
  for (let i = next.length - 1; i > 0; i--) {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(r * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TeamEnd({
  team,
  align,
  score,
}: {
  team: { name: string; colorIndex: number };
  align: "left" | "right";
  score: string;
}): React.JSX.Element {
  // One treatment for player and spectator; sizes step down on a phone so both
  // full team names and their scores fit a narrow viewport without truncating
  // (the name pairing is load-bearing per UI.md's team-palette law).
  return (
    <div
      className={cx(
        "flex min-w-0 items-center gap-2 sm:gap-3",
        align === "right" && "flex-row-reverse",
      )}
    >
      <span
        className="h-3.5 w-3.5 flex-none rounded-r1 sm:h-5 sm:w-5"
        style={{ background: `var(--color-team-${team.colorIndex})` }}
        aria-hidden
      />
      <span className="truncate font-display text-base uppercase text-s12 sm:text-2xl">
        {team.name}
      </span>
      <span className="font-display text-xl text-s12 sm:text-4xl">{score}</span>
    </div>
  );
}

/** The rope: braided track with team-color handles, center tick, and a
 *  sticker-chrome knot sliding on p ∈ [−1,+1]. One size for every viewer —
 *  the player reads the same rope the projector shows. A game-surface
 *  indicator designed against the status vocabulary — team color is identity
 *  at the ends; position itself is the state. */
function Rope({ p }: { p: number }): React.JSX.Element {
  const percent = ((p + 1) / 2) * 100;
  const toward = p === 0 ? "centered" : p < 0 ? TEAM_A.name : TEAM_B.name;
  return (
    <div
      role="img"
      aria-label={`Rope ${toward === "centered" ? "at center" : `pulled toward ${toward}`}`}
      className="relative h-24 w-full"
    >
      <div
        className="absolute inset-x-1 top-1/2 h-6 -translate-y-1/2 rounded-r2"
        style={{
          background:
            "repeating-linear-gradient(45deg, var(--color-s6) 0 8px, var(--color-s7) 8px 16px)",
        }}
        aria-hidden
      />
      <div
        className="absolute left-0 top-1/2 h-14 w-4 -translate-y-1/2 rounded-r1"
        style={{ background: `var(--color-team-${TEAM_A.colorIndex})` }}
        aria-hidden
      />
      <div
        className="absolute right-0 top-1/2 h-14 w-4 -translate-y-1/2 rounded-r1"
        style={{ background: `var(--color-team-${TEAM_B.colorIndex})` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/2 h-16 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-s8"
        aria-hidden
      />
      <motion.div
        aria-hidden
        initial={false}
        animate={{ left: `${percent}%` }}
        transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        className="sticker absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-s12"
      >
        <div className="absolute inset-1.5 border-2 border-s8" aria-hidden />
      </motion.div>
    </div>
  );
}

/** Directional drama: the leading team's color washes in from their own wall,
 *  swelling as the knot nears their pin. The wash stays glued to the team's
 *  side (identity, not status hue); the rope remains the state indicator. */
function WinGlow({ p }: { p: number }): React.JSX.Element {
  const strength = Math.max(0, Math.abs(p) - 0.12) / 0.88;
  return (
    <>
      {([TEAM_A, TEAM_B] as const).map((team) => {
        const side = team === TEAM_A ? "left" : "right";
        const leading = team === TEAM_A ? p < 0 : p > 0;
        return (
          <motion.div
            key={team.name}
            aria-hidden
            initial={false}
            animate={{ opacity: leading ? 0.12 + strength * 0.28 : 0 }}
            transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
            className={cx(
              "pointer-events-none fixed inset-y-0 w-1/2",
              side === "left" ? "left-0" : "right-0",
            )}
            style={{
              background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--color-team-${team.colorIndex}), transparent)`,
            }}
          />
        );
      })}
    </>
  );
}

/** The anonymized event log both roles read: team chip + name + signed delta,
 *  newest first. The list reserves a fixed height for TICKER_LENGTH rows and
 *  clips overflow, so a new event animates in place instead of resizing the
 *  block and shoving the rest of the surface around; `layout` slides the
 *  existing rows down smoothly rather than snapping. */
function Ticker({
  events,
  compact = false,
}: {
  events: TickerEvent[];
  compact?: boolean;
}): React.JSX.Element {
  return (
    <ul
      aria-live="polite"
      className={cx(
        "flex flex-col items-center gap-1 overflow-hidden",
        compact ? "h-24" : "h-28",
      )}
    >
      <AnimatePresence initial={false}>
        {events.map((event) => (
          <motion.li
            key={event.id}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ ease: SLIP_EASE, duration: SLIP_DUR.base }}
            className={cx(
              "flex items-center justify-center gap-2",
              compact ? "text-meta text-s8" : "text-sec text-s9",
            )}
          >
            <span
              className={cx(
                "flex-none rounded-r1",
                compact ? "h-2 w-2" : "h-2.5 w-2.5",
              )}
              style={{
                background: `var(--color-team-${
                  event.team === "A" ? TEAM_A.colorIndex : TEAM_B.colorIndex
                })`,
              }}
              aria-hidden
            />
            {event.team === "A" ? TEAM_A.name : TEAM_B.name}{" "}
            <span
              className={cx(
                "font-bold",
                event.delta > 0 ? "text-ok" : "text-crit",
              )}
            >
              {event.delta > 0 ? `+${event.delta}` : event.delta}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function ScorePop({
  popKey,
  delta,
}: {
  popKey: number;
  delta: number;
}): React.JSX.Element | null {
  if (popKey === 0) return null;
  return (
    <motion.span
      key={popKey}
      initial={{ opacity: 0, y: 0, rotate: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: -22, rotate: delta > 0 ? 6 : -6 }}
      transition={{ duration: 0.7, ease: SLIP_EASE }}
      className={cx(
        "pointer-events-none absolute -top-1 right-0 font-hand text-xl",
        delta > 0 ? "text-ok" : "text-crit",
      )}
      aria-hidden
    >
      {delta > 0 ? `+${delta}` : delta}
    </motion.span>
  );
}

function QuestionCard({
  question,
  disabled,
  onAnswer,
}: {
  question: MockQuestion;
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
}): React.JSX.Element {
  // Deterministic per-question order: identical on the server and the client,
  // so the choices never trigger a hydration mismatch (a plain Math.random
  // shuffle in render would).
  const [choices] = useState(() =>
    seededShuffle(
      [question.correct, ...question.wrong],
      hashSeed(question.prompt),
    ),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const revealing = picked !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ ease: SLIP_EASE, duration: SLIP_DUR.enter }}
      className="flex flex-col gap-4"
    >
      <p className="text-center text-lg font-bold text-balance text-s12">
        {question.prompt}
      </p>
      {/* 2×2 answer grid on the full-width surface; collapses to a single
          vertical stack of four when the surface is too narrow. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const isPicked = picked === choice;
          const isCorrect = choice === question.correct;
          const showOk = revealing && isCorrect;
          const showCrit = revealing && isPicked && !isCorrect;
          return (
            <motion.button
              key={choice}
              type="button"
              animate={showCrit ? { x: SHAKE_KEYFRAMES } : undefined}
              transition={{ duration: 0.4 }}
              disabled={disabled || revealing}
              onClick={() => {
                setPicked(choice);
                onAnswer(isCorrect);
              }}
              className={cx(
                "slip sticker rounded-r2 px-4 py-3 text-center text-sec font-bold",
                showOk && "border-ok bg-s4 text-s12",
                showCrit && "border-crit bg-s2 text-s11",
                !revealing &&
                  "sticker-hover sticker-press cursor-pointer bg-s2 text-s11",
                revealing && !showOk && !showCrit && "bg-s2 text-s8",
              )}
            >
              {choice}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function EndOverlay({ phase }: { phase: Phase }): React.JSX.Element | null {
  if (phase === "playing") return null;
  const headline =
    phase === "time"
      ? "Time!"
      : `${phase === "pinned-a" ? TEAM_A.name : TEAM_B.name} pins it!`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-(--z-sticky) flex flex-col items-center justify-center gap-3 bg-scrim"
    >
      <motion.p
        initial={{ scale: 2.6, rotate: -14, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        className="font-display text-5xl uppercase text-s12"
      >
        {headline}
      </motion.p>
      <p className="text-sec text-s9">The scoring screen takes over here.</p>
    </motion.div>
  );
}

export function TriviaMockup(): React.JSX.Element {
  const [role, setRole] = useState<Role>("player");
  const [pauseBots, setPauseBots] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [p, setP] = useState(0);
  const [clockPhase, setClockPhase] = useState<"playing" | "time">("playing");
  const [remaining, setRemaining] = useState(PLAY_SECONDS);
  // Pin is derived from p, never stored — the sim can't disagree with itself.
  const phase: Phase = p <= -1 ? "pinned-a" : p >= 1 ? "pinned-b" : clockPhase;
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [pop, setPop] = useState({ key: 0, delta: 0 });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [dealt, setDealt] = useState(0);
  const [awaitingDeal, setAwaitingDeal] = useState(false);
  const eventId = useRef(0);
  const dealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pushEvent = useCallback((team: "A" | "B", delta: number) => {
    eventId.current += 1;
    const id = eventId.current;
    setEvents((prev) => [{ id, team, delta }, ...prev].slice(0, TICKER_LENGTH));
  }, []);

  const applyImpulse = useCallback((toward: "A" | "B", magnitude: number) => {
    // Team A's wall is −1, team B's is +1; clamping to a wall is the pin.
    setP((prev) => {
      const next = toward === "A" ? prev - magnitude : prev + magnitude;
      return Math.max(-1, Math.min(1, next));
    });
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setP((prev) => {
        if (Math.abs(prev) >= 1) return prev;
        const decay = Math.pow(0.5, TICK_MS / 1000 / DECAY_HALF_LIFE_S);
        return prev * decay;
      });
      if (!pauseBots && Math.random() < BOT_ANSWER_CHANCE_PER_TICK * 2) {
        const team = Math.random() < 0.5 ? "A" : "B";
        const correct = Math.random() < BOT_CORRECT_RATE;
        const delta = correct ? 3 : -1;
        pushEvent(team, delta);
        if (team === "A") setScoreA((s) => s + delta);
        else setScoreB((s) => s + delta);
        applyImpulse(
          correct ? team : team === "A" ? "B" : "A",
          correct ? IMPULSE_CORRECT : IMPULSE_WRONG,
        );
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [phase, pauseBots, pushEvent, applyImpulse]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setClockPhase("time");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const answer = (correct: boolean) => {
    const delta = correct ? 3 : -1;
    setMyScore((s) => s + delta);
    setScoreA((s) => s + delta);
    setPop((prev) => ({ key: prev.key + 1, delta }));
    pushEvent("A", delta);
    applyImpulse(
      correct ? "A" : "B",
      correct ? IMPULSE_CORRECT : IMPULSE_WRONG,
    );
    setAwaitingDeal(true);
    dealTimer.current = setTimeout(() => {
      setQuestionIndex((i) => (i + 1) % DECK.length);
      setDealt((d) => d + 1);
      setAwaitingDeal(false);
    }, FEEDBACK_MS);
  };

  const reset = () => {
    clearTimeout(dealTimer.current);
    setP(0);
    setClockPhase("playing");
    setRemaining(PLAY_SECONDS);
    setEvents([]);
    setScoreA(0);
    setScoreB(0);
    setMyScore(0);
    setPop({ key: 0, delta: 0 });
    setQuestionIndex(0);
    setDealt(0);
    setAwaitingDeal(false);
    setResetKey((n) => n + 1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh bg-s1">
        <WinGlow p={p} />
        <main className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 p-6">
          <span className="text-meta font-bold uppercase tracking-widest text-s7">
            Mockup · trivia tug-of-war ({role})
          </span>

          {/* One surface for both roles: the player reads the same big clock,
              team scores, and rope the projector shows — with their own running
              score and the answer options added. */}
          <div
            className={cx(
              "flex flex-1 flex-col gap-6",
              role === "spectator" && "justify-center",
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-4xl text-s12 sm:text-5xl">
                {formatClock(remaining)}
              </p>
              {role === "player" && (
                <div className="relative">
                  <span className="text-sec font-bold text-s11">
                    You · {myScore} pts
                  </span>
                  <ScorePop popKey={pop.key} delta={pop.delta} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <TeamEnd team={TEAM_A} align="left" score={`${scoreA}`} />
                <TeamEnd team={TEAM_B} align="right" score={`${scoreB}`} />
              </div>
              <Rope p={p} />
            </div>

            {role === "player" && (
              <div className="mx-auto w-full max-w-3xl">
                <AnimatePresence mode="wait">
                  <QuestionCard
                    key={`${resetKey}-${dealt}`}
                    question={DECK[questionIndex]}
                    disabled={phase !== "playing" || awaitingDeal}
                    onAnswer={answer}
                  />
                </AnimatePresence>
              </div>
            )}

            <div
              className={cx(
                role === "player" ? "mt-auto" : "mx-auto w-full max-w-md",
              )}
            >
              <Ticker events={events} compact={role === "player"} />
            </div>
          </div>
          <EndOverlay phase={phase} />
        </main>

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
            Pause bots
            <Toggle
              on={pauseBots}
              onChange={setPauseBots}
              aria-label="Pause bots"
            />
          </label>
          <Button onClick={() => setP(-1)}>Force pin (Rocketeers)</Button>
          <Button onClick={reset}>Reset</Button>
        </Card>
      </div>
    </MotionConfig>
  );
}
