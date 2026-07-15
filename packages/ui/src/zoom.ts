/** Zoom-scale context (ZoomProvider/useZoom): the app's base scale for
 *  pointer→layout math. Defaults to 1 — this app never zooms; kept for
 *  portability. Client module: creates a React context at load, so it must be
 *  a client boundary for the barrel to be importable from a Server Component. */
"use client";

import { createContext, useContext } from "react";

const ZoomContext = createContext(1);

export const ZoomProvider = ZoomContext.Provider;

export function useZoom(): number {
  return useContext(ZoomContext);
}
