/**
 * Lazily loads the word list in the browser and answers membership. Fetched at
 * the gate, while the demo and countdown run, so the first trace of a match
 * already has it. A miss before it lands is silent: the hint only styles the
 * traced word, and the server is the authority on every capture.
 */
"use client";
import { useEffect, useState } from "react";

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

function load(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch("/api/wordlock/words")
    .then((response) => {
      // A non-2xx body is still text, and parsing an error page would build a
      // garbage set that silently reds out every legal word.
      if (!response.ok) throw new Error(`word list ${response.status}`);
      return response.text();
    })
    .then((blob) => {
      cache = new Set(blob.split("\n").filter((line) => line.length > 0));
      return cache;
    })
    .catch((error: unknown) => {
      // Clearing the memo is what makes a failure recoverable: a retained
      // rejected promise would be handed to every later caller for the life
      // of the page, so one dropped request would disable the hint forever.
      inflight = null;
      throw error;
    });
  return inflight;
}

export function preloadHintDictionary(): void {
  // Same reasoning as the hook: a dropped preload costs the hint, not the
  // game, and must not surface as an unhandled rejection.
  void load().catch(() => {});
}

export function useHintDictionary(): {
  ready: boolean;
  has: (word: string) => boolean;
} {
  const [ready, setReady] = useState(cache !== null);
  useEffect(() => {
    let live = true;
    void load()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        // The hint is an affordance, not a dependency: without it the traced
        // word simply never lights, and the server still decides every
        // capture. Swallowing here keeps a dropped request from surfacing as
        // an unhandled rejection on every mount that races the fetch.
      });
    return () => {
      live = false;
    };
  }, []);
  return {
    ready,
    has: (word: string) => cache?.has(word.toUpperCase()) ?? false,
  };
}
