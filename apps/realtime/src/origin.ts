/**
 * Authenticated calls back to the Next app — the only place this Worker reaches
 * Postgres, and it does so indirectly. Failures return null rather than
 * throwing; callers decide whether to refuse a connection or retry on an alarm.
 */
import type { HydrateResponse, PersistRequest } from "@jumbo/protocol";
import type { MatchState } from "@jumbo/engine";
import type { Env } from "./env";

export async function fetchHydrate(
  env: Env,
  matchId: string,
): Promise<HydrateResponse | null> {
  try {
    const res = await fetch(
      `${env.ORIGIN_URL}/api/internal/matches/${matchId}/hydrate`,
      { headers: { "x-internal-auth": env.REALTIME_SHARED_SECRET } },
    );
    if (!res.ok) return null;
    return (await res.json()) as HydrateResponse;
  } catch {
    return null;
  }
}

export async function postPersist(
  env: Env,
  matchId: string,
  state: MatchState,
  completedOrdinal: number,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${env.ORIGIN_URL}/api/internal/matches/${matchId}/persist`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-auth": env.REALTIME_SHARED_SECRET,
        },
        body: JSON.stringify({
          state,
          completedOrdinal,
        } satisfies PersistRequest),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
