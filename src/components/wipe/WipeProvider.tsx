/**
 * Mounts the app-wide slam wipe once (in the root layout, so it survives
 * whatever it covers) and drives the pure wipe machine: it plays the panel,
 * runs the covered action inside a transition, holds while that transition is
 * pending (enforcing a min floor that collapses under reduced motion — it's a
 * motion floor, not a functional one — while the max-covered still-loading
 * cue stays full-length, since it gates a loading affordance, not motion),
 * then reveals. The covered action is any transition-wrappable call — a
 * router push (navigate()) or a same-URL router.refresh() (cover()) both
 * supply the transition whose pending→settled edge is the machine's
 * "committed" signal. A destination that never commits is caught by the
 * FORCE_REVEAL_MS ceiling, which reveals anyway. Exposes cover() and
 * navigate() through WipeNavCtx.
 *
 * While the panel hides the page (covering through covered, but not the reveal),
 * the {children} subtree — and only that subtree — is marked `inert`, dropping
 * it from the tab order and accessibility tree. Portaled
 * overlays (modals, popovers, selects, tooltips) render outside this wrapper
 * straight onto document.body and are NOT covered by it (see docs/ROADMAP.md
 * known gaps). The wrapper uses `display: contents` so it introduces no layout
 * box between <body> (which relies on being a flex container for its children)
 * and the page content.
 */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { SlamWipe, WIPE_DUR } from "@jumbo/ui";
import { WipeNavCtx } from "./context";
import { initialWipeState, wipeReducer } from "@/lib/wipe/machine";

const toMs = (seconds: number) => seconds * 1000;

// Upper bound on how long a stalled navigation may hold the screen. A
// destination that never commits leaves no other way out of the covered hold,
// so the panel reveals on its own rather than trapping the user behind it.
const FORCE_REVEAL_MS = 15_000;

export function WipeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  // Null only under SSR (where no timer runs anyway) — on the client this is a
  // real boolean from first render. Treat null as full motion regardless, so we
  // never collapse the hold on a guess.
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(wipeReducer, initialWipeState);
  const [isPending, startTransition] = useTransition();
  const pendingAction = useRef<(() => void) | null>(null);
  const navStarted = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Set synchronously by cover() and cleared when the machine returns to idle.
  // This tracks "a wipe is in flight" rather than mirroring state.phase: a
  // mirror is only as fresh as the render (or effect) that syncs it, so two
  // cover() calls in one tick would both read the pre-dispatch phase and the
  // second one's action would be dropped. Setting it inside cover() leaves no
  // stale window. Since cover() is navStart's only dispatcher, this tracks the
  // machine's non-idle span exactly.
  const wipeInFlight = useRef(false);

  const cover = useCallback((action: () => void, opts?: { label?: string }) => {
    // The machine only accepts navStart from "idle" (see machine.ts), so with a
    // wipe already in flight the dispatch would no-op and the action would be
    // silently dropped — stranding whoever called cover() (e.g. a client whose
    // phase change never gets its refresh). Run it directly instead: the
    // in-flight wipe already covers the screen, so it still happens under
    // cover, just without owning its own panel. Plain call, not
    // startTransition — a transition is already running and owns the
    // pending→settled edge the machine reads as "committed"; a second one here
    // risks moving that edge instead of this one's.
    if (wipeInFlight.current) {
      action();
      return;
    }
    wipeInFlight.current = true;
    pendingAction.current = action;
    dispatch({ type: "navStart", label: opts?.label ?? null });
  }, []);

  const navigate = useCallback(
    (href: string, opts?: { label?: string }) =>
      cover(() => router.push(href), opts),
    [cover, router],
  );

  // The in-sweep finished covering: run the covered action and arm the timers.
  const onCovered = useCallback(() => {
    dispatch({ type: "wipeInDone" });
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) {
      navStarted.current = true;
      startTransition(action);
    }
    // minCovered is a motion floor (reads as a full wipe on a fast action) —
    // collapse it under reduced motion. maxCovered gates the still-loading
    // cue, a functional affordance, not motion — it stays unconditional.
    const minCoveredMs = reduceMotion ? 0 : toMs(WIPE_DUR.minCovered);
    timers.current = [
      setTimeout(() => dispatch({ type: "minElapsed" }), minCoveredMs),
      setTimeout(
        () => dispatch({ type: "maxElapsed" }),
        toMs(WIPE_DUR.maxCovered),
      ),
      setTimeout(() => dispatch({ type: "forceElapsed" }), FORCE_REVEAL_MS),
    ];
  }, [reduceMotion]);

  const onUncovered = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // wipeOutDone is the machine's only route back to idle, so this is the one
    // place the in-flight flag clears. If a wipe somehow never reveals, the flag
    // stays set and later cover() calls run their action uncovered — the actions
    // still happen, which is the safe way to fail.
    wipeInFlight.current = false;
    dispatch({ type: "wipeOutDone" });
  }, []);

  // The transition's falling edge (pending true → false, only after we started
  // it) is the "committed" signal.
  useEffect(() => {
    if (navStarted.current && !isPending) {
      navStarted.current = false;
      dispatch({ type: "committed" });
    }
  }, [isPending]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Whether the wipe panel is mounted at all — not the machine's "covering"
  // phase, which is only the in-sweep. Named distinctly to avoid confusing
  // the two across the machine/provider seam.
  const wipeMounted = state.phase !== "idle";
  // Inert only while the panel actually hides the page. Through `revealing` the
  // destination is visibly sweeping back into view, so it must accept input
  // again — leaving it inert there drops ~360ms of keystrokes on a page the
  // user can already see (and `.fill()`-style input silently no-ops rather than
  // waiting). The panel is opaque at --z-wipe, so it still blocks pointers over
  // whatever it covers mid-sweep; inert is only about tab order and the a11y
  // tree while the content is hidden.
  const pageHidden = state.phase === "covering" || state.phase === "covered";

  // cover/navigate are stable (empty-dep useCallback), so this object is only
  // reallocated when they change — not on every one of the ~5 renders per wipe.
  const ctxValue = useMemo(() => ({ cover, navigate }), [cover, navigate]);

  return (
    <WipeNavCtx.Provider value={ctxValue}>
      <div className="contents" inert={pageHidden}>
        {children}
      </div>
      {wipeMounted && (
        <SlamWipe
          phase={
            state.phase === "covering"
              ? "in"
              : state.phase === "revealing"
                ? "out"
                : "covered"
          }
          label={state.label ?? undefined}
          showCue={state.showCue}
          onCovered={onCovered}
          onUncovered={onUncovered}
        />
      )}
    </WipeNavCtx.Provider>
  );
}
