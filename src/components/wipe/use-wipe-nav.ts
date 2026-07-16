/**
 * Access the app-wide wipe transition. Full-page navigations call navigate()
 * (optionally with a destination label) instead of pushing the router
 * directly, so the slam wipe covers the route change; same-URL beats (e.g. a
 * server-render swap via router.refresh()) call cover() directly with the
 * action to run under the panel. Throws outside WipeProvider.
 */
"use client";

import { useContext } from "react";
import { WipeNavCtx, type WipeNavContext } from "./context";

export function useWipeNav(): WipeNavContext {
  const ctx = useContext(WipeNavCtx);
  if (!ctx) throw new Error("useWipeNav must be used within WipeProvider");
  return ctx;
}
