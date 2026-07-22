/**
 * Re-syncs a live surface after the browser restores it. Next's client cache
 * reuses a page's RSC payload on back/forward (and bfcache restores the whole
 * document), so a restored tournament surface can paint state that moved on
 * while it was away, healing only on the next Realtime broadcast. This calls
 * the supplied resync on mount, on a persisted `pageshow`, and when the tab
 * returns to visible.
 */
"use client";

import { useEffect, useRef } from "react";

export function useRefreshOnRestore(resync: () => void): void {
  // Kept in a ref so a caller passing an inline closure doesn't re-arm the
  // listeners (and re-fire the mount resync) on every render.
  const resyncRef = useRef(resync);
  useEffect(() => {
    resyncRef.current = resync;
  }, [resync]);

  useEffect(() => {
    const run = () => resyncRef.current();

    // The router-cache restore path fires no event of its own: the component
    // simply mounts against a reused payload.
    run();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) run();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
