/**
 * Ticking clock hook for timestamp-driven UI (countdowns, play timers).
 * Coarse by design — server timestamps carry the truth.
 */
"use client";

import { useEffect, useState } from "react";

export function useNow(intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
