/**
 * Shared context for the wipe transition system: the imperative cover() and
 * navigate() the hook exposes. Split from the provider so WipeLink and
 * useWipeNav import the context without pulling in the provider's client
 * tree.
 */
"use client";

import { createContext } from "react";

export interface WipeNavContext {
  /**
   * Play the wipe and run `action` under cover, inside the transition that
   * supplies the machine's "committed" signal. `action` can be any
   * transition-wrappable call (a router push, a router refresh, ...), not
   * just a navigation.
   */
  cover: (action: () => void, opts?: { label?: string }) => void;
  /** Thin wrapper over cover() for the common case: push a href under cover. */
  navigate: (href: string, opts?: { label?: string }) => void;
}

export const WipeNavCtx = createContext<WipeNavContext | null>(null);
