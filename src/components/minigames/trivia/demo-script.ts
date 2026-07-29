/**
 * The Tug O' Lore gate demo's script: a pure function from elapsed milliseconds
 * to everything the demo band draws. Kept apart from the component so the
 * timeline is unit-testable and the component is a bare render loop.
 *
 * This authors an *appearance*, not a simulation. A real match runs ninety
 * seconds and a tier timer runs twenty-three; the gate has about ten seconds of
 * a player's attention. So the script states tier, charge and ring fraction
 * directly and builds a TierState that makes the real TierMeter draw them —
 * the meter and the rope are the shipping components, and only their inputs are
 * staged. Nothing here is reachable from play; `advanceRope` and `addCharge`
 * remain the only things that move a real match.
 *
 * The four beats, in the order the rules matter: right answers build power →
 * the stronger side drags the rope → power slips if you stop → a wrong answer
 * costs seconds, not points.
 */
import { CHARGE_PER_TIER, TIER_SECONDS, type TierState } from "@jumbo/engine";

export const CYCLE_MS = 10_000;

/** Verdict shown on the picked choice; `idle` means nothing is picked yet. */
export type DemoVerdict = "idle" | "correct" | "wrong";

export interface DemoCard {
  prompt: string;
  choices: readonly [string, string, string, string];
  /** Index of the choice the script picks. */
  answer: number;
}

export interface DemoFrame {
  /** Synthetic clock the meters resolve their timers against. */
  now: number;
  tierA: TierState;
  tierB: TierState;
  /** Tier gap, A minus B — what the rope's chevron reads. */
  gap: number;
  /** Rope position in [-1, +1]; +1 is team A's wall, the server's convention. */
  p: number;
  card: DemoCard;
  /** The choice the script has picked on this card, or null before it picks. */
  picked: number | null;
  verdict: DemoVerdict;
  /** Seconds left on the lockout, or null when the player is free. */
  lockoutSeconds: number | null;
}

/**
 * Deliberately dull questions. The demo teaches the rope, not the trivia, and a
 * genuinely interesting question steals the attention the rope needs.
 */
const CARDS: readonly DemoCard[] = [
  {
    prompt: "How many sides does a hexagon have?",
    choices: ["Five", "Six", "Seven", "Eight"],
    answer: 1,
  },
  {
    prompt: "Which ocean is the largest?",
    choices: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: 2,
  },
  {
    prompt: "What is the capital of Japan?",
    choices: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
    answer: 2,
  },
];

/**
 * One team's staged meter reading. `ring` is the fraction of the tier timer
 * still to run, or null for a tier that cannot expire.
 */
interface Meter {
  tier: number;
  charge: number;
  ring: number | null;
}

/** Linear interpolation, clamped to the segment. */
function lerp(from: number, to: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return from + (to - from) * clamped;
}

/** Progress through a window, 0 before it and 1 after. */
function through(elapsed: number, start: number, end: number): number {
  return (elapsed - start) / (end - start);
}

/**
 * Build the TierState that makes TierMeter draw `meter` at `now`. The entry
 * timestamp is back-dated so the meter's own `resolveTier` reports exactly the
 * remaining fraction the script asked for — and never far enough back to
 * trigger a real demotion, which would desync the script from the picture.
 */
function stageTier(meter: Meter, now: number): TierState {
  const span = (TIER_SECONDS[meter.tier] ?? Number.POSITIVE_INFINITY) * 1000;
  const enteredAt =
    meter.ring === null || !Number.isFinite(span)
      ? null
      : now - (1 - meter.ring) * span;
  return {
    tier: meter.tier,
    enteredAt,
    charge: meter.charge * CHARGE_PER_TIER,
  };
}

/** Team A's arc: two correct answers around one wrong one. */
function meterA(elapsed: number): Meter {
  if (elapsed < 1600) return { tier: 1, charge: 0, ring: null };
  // First correct answer: half a tier of charge.
  if (elapsed < 3400) {
    return {
      tier: 1,
      charge: lerp(0, 0.5, through(elapsed, 1600, 2000)),
      ring: null,
    };
  }
  // Second correct answer completes the climb to tier 2, and its timer starts.
  if (elapsed < 5400) {
    return {
      tier: 2,
      charge: lerp(0, 0.15, through(elapsed, 3400, 5400)),
      ring: lerp(1, 0.9, through(elapsed, 3400, 5400)),
    };
  }
  // The wrong answer and its lockout: no charge arrives while locked out, so
  // the ring keeps draining. This is the cost, drawn.
  if (elapsed < 9200) {
    return {
      tier: 2,
      charge: 0.15,
      ring: lerp(0.9, 0.55, through(elapsed, 5400, 9200)),
    };
  }
  return {
    tier: 2,
    charge: lerp(0.15, 0.65, through(elapsed, 9200, CYCLE_MS)),
    ring: lerp(0.55, 0.5, through(elapsed, 9200, CYCLE_MS)),
  };
}

/** Team B's arc: ahead, then out of time. They are the "power slips" lesson. */
function meterB(elapsed: number): Meter {
  if (elapsed < 4200) {
    return {
      tier: 2,
      charge: 0.4,
      // Drains into the meter's red zone, so the slip is announced before it
      // happens rather than arriving as a mystery.
      ring: lerp(0.6, 0.02, through(elapsed, 0, 4200)),
    };
  }
  return { tier: 1, charge: 0.2, ring: null };
}

/**
 * The rope, integrated by hand rather than by `advanceRope`: the script needs a
 * visible crawl inside ten seconds, and the real sensitivity would move it
 * about a pixel. Direction always matches the gap, which is the part that has
 * to be true.
 */
function ropeAt(elapsed: number): number {
  // Team B leads while their tier holds, so the rope creeps toward their wall.
  if (elapsed < 3400) return lerp(0, -0.18, through(elapsed, 0, 3400));
  // A climbs to match: the gap closes and the rope holds where it is.
  if (elapsed < 4200) return -0.18;
  // B slips, A leads, and the rope reverses and keeps coming for the rest.
  return lerp(-0.18, 0.42, through(elapsed, 4200, CYCLE_MS));
}

/** Which card is on screen, and what the script has done to it. */
function cardAt(elapsed: number): {
  card: DemoCard;
  picked: number | null;
  verdict: DemoVerdict;
} {
  if (elapsed < 2600) {
    const card = CARDS[0];
    const picked = elapsed >= 1600 ? card.answer : null;
    return { card, picked, verdict: picked === null ? "idle" : "correct" };
  }
  if (elapsed < 4600) {
    const card = CARDS[1];
    const picked = elapsed >= 3400 ? card.answer : null;
    return { card, picked, verdict: picked === null ? "idle" : "correct" };
  }
  if (elapsed < 9200) {
    // The wrong pick: a choice that is not the answer, held through the lockout
    // so the shake and the banner belong to the same card.
    const card = CARDS[2];
    const wrong = (card.answer + 1) % card.choices.length;
    const picked = elapsed >= 5400 ? wrong : null;
    return { card, picked, verdict: picked === null ? "idle" : "wrong" };
  }
  const card = CARDS[0];
  return { card, picked: card.answer, verdict: "correct" };
}

/** Lockout window: three seconds from the wrong answer, matching LOCKOUT_MS. */
function lockoutAt(elapsed: number): number | null {
  if (elapsed < 5400 || elapsed >= 8400) return null;
  return Math.ceil((8400 - elapsed) / 1000);
}

/**
 * The whole demo band at `elapsed` ms into the cycle. `now` is threaded in so
 * the staged tier timers resolve against the same clock the caller renders at.
 */
export function demoFrameAt(elapsed: number, now: number): DemoFrame {
  const wrapped = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const a = meterA(wrapped);
  const b = meterB(wrapped);
  const { card, picked, verdict } = cardAt(wrapped);
  return {
    now,
    tierA: stageTier(a, now),
    tierB: stageTier(b, now),
    gap: a.tier - b.tier,
    p: ropeAt(wrapped),
    card,
    picked,
    verdict,
    lockoutSeconds: lockoutAt(wrapped),
  };
}

/**
 * The frame reduced motion pins to: mid-pull, one team clearly ahead, a card
 * answered correctly. Chosen because it is the only single frame that shows all
 * three of tier gap, rope displacement and a verdict at once.
 */
export const STILL_FRAME_MS = 4400;
