/**
 * Pulling-power tiers: the pure engine behind Tug O' Lore's force. A team's
 * tier sets how hard it pulls; correct answers accumulate charge toward the
 * next tier; each tier runs a timer that demotes the team if it expires before
 * the climb, which is what stops a steady team parking at the ceiling forever.
 *
 * Tier is a pure function of stored state plus a server-stamped clock, so the
 * server and every client derive the same value with no tick loop behind the
 * match — the same trick the rope's position uses.
 */
import {
  CHARGE_PER_TIER,
  DEMOTION_KEEP,
  MAX_TIER,
  MIN_TIER,
  TIER_SECONDS,
} from "./tuning";

export interface TierState {
  /** Current tier, MIN_TIER..MAX_TIER. */
  tier: number;
  /**
   * Epoch ms this tier was entered — the timer's origin. `null` until the
   * team's first answer: `init` runs at countdown start, not play start, so an
   * eagerly-started timer would burn countdown seconds a team cannot play in.
   */
  enteredAt: number | null;
  /** Normalized charge toward the next tier. */
  charge: number;
}

export const INITIAL_TIER: TierState = { tier: 1, enteredAt: null, charge: 0 };

function tierMs(tier: number): number {
  return (TIER_SECONDS[tier] ?? Number.POSITIVE_INFINITY) * 1000;
}

/**
 * Walk expired timers forward to `now`. Each expiry drops one tier, keeps
 * DEMOTION_KEEP of the charge, and restarts the timer at the instant of
 * demotion — so a long gap between two answers resolves to the same tier the
 * team would have reached had anyone been watching. Bounded by MIN_TIER, which
 * is what keeps a team that played and stalled level with one that never
 * played rather than below it.
 */
export function resolveTier(state: TierState, now: number): TierState {
  if (state.enteredAt === null) return state;
  let tier = state.tier;
  let enteredAt = state.enteredAt;
  let charge = state.charge;
  while (tier > MIN_TIER && now >= enteredAt + tierMs(tier)) {
    enteredAt += tierMs(tier);
    tier -= 1;
    charge *= DEMOTION_KEEP;
  }
  return { tier, enteredAt, charge };
}

/** Resolve to `now`, then add charge and promote as far as it carries. */
export function addCharge(
  state: TierState,
  now: number,
  amount: number,
): TierState {
  const started =
    state.enteredAt === null ? { ...state, enteredAt: now } : state;
  const resolved = resolveTier(started, now);
  let tier = resolved.tier;
  let charge = resolved.charge + amount;
  let enteredAt = resolved.enteredAt;
  while (tier < MAX_TIER && charge >= CHARGE_PER_TIER) {
    charge -= CHARGE_PER_TIER;
    tier += 1;
    enteredAt = now;
  }
  // At the ceiling there is nothing to spend charge on; capping keeps the bar
  // full rather than letting an unspendable surplus bank up, so the half kept
  // through the inevitable demotion is bounded.
  if (tier === MAX_TIER && charge > CHARGE_PER_TIER) charge = CHARGE_PER_TIER;
  return { tier, enteredAt, charge };
}

/** The tier in force at `at`. */
export function tierAt(state: TierState, at: number): number {
  return resolveTier(state, at).tier;
}

/**
 * Demotion instants strictly inside (from, to) — the boundaries at which this
 * team's force changes, which is what lets the rope integrate exactly instead
 * of sampling.
 */
export function tierBreakpoints(
  state: TierState,
  from: number,
  to: number,
): number[] {
  const resolved = resolveTier(state, from);
  if (resolved.enteredAt === null) return [];
  const points: number[] = [];
  let tier = resolved.tier;
  let enteredAt = resolved.enteredAt;
  while (tier > MIN_TIER) {
    const expires = enteredAt + tierMs(tier);
    if (expires >= to) break;
    points.push(expires);
    enteredAt = expires;
    tier -= 1;
  }
  return points;
}

/**
 * When the current tier's timer runs out, or null if it cannot — at the floor
 * there is nothing left to lose, so an idle team and a stalled one both report
 * no deadline and their meters read identically.
 */
export function tierExpiresAt(state: TierState, now: number): number | null {
  const resolved = resolveTier(state, now);
  if (resolved.enteredAt === null || resolved.tier <= MIN_TIER) return null;
  return resolved.enteredAt + tierMs(resolved.tier);
}
