/**
 * Pure state machine for the slam-wipe transition (see the design spec). Maps
 * navigation + timing events to a phase, with no DOM, timers, or router — the
 * WipeProvider feeds it real signals (animation-complete, setTimeout, the
 * router transition's isPending) and renders the phase. Leaving the covered
 * hold requires BOTH the destination committed AND the min-covered floor, so a
 * fast navigation still reads as a full wipe and a slow one holds until ready.
 */

export type WipePhase = "idle" | "covering" | "covered" | "revealing";

export interface WipeState {
  phase: WipePhase;
  label: string | null;
  committed: boolean;
  minElapsed: boolean;
  showCue: boolean;
}

export type WipeEvent =
  | { type: "navStart"; label: string | null }
  | { type: "wipeInDone" }
  | { type: "committed" }
  | { type: "minElapsed" }
  | { type: "maxElapsed" }
  | { type: "wipeOutDone" };

export const initialWipeState: WipeState = {
  phase: "idle",
  label: null,
  committed: false,
  minElapsed: false,
  showCue: false,
};

// covered → revealing only once the destination committed AND the min floor
// passed. Run after every event that can satisfy either condition.
function maybeReveal(state: WipeState): WipeState {
  if (state.phase === "covered" && state.committed && state.minElapsed) {
    return { ...state, phase: "revealing" };
  }
  return state;
}

export function wipeReducer(state: WipeState, event: WipeEvent): WipeState {
  switch (event.type) {
    case "navStart":
      if (state.phase !== "idle") return state;
      return {
        phase: "covering",
        label: event.label,
        committed: false,
        minElapsed: false,
        showCue: false,
      };
    case "wipeInDone":
      if (state.phase !== "covering") return state;
      return maybeReveal({ ...state, phase: "covered" });
    case "committed":
      return maybeReveal({ ...state, committed: true });
    case "minElapsed":
      return maybeReveal({ ...state, minElapsed: true });
    case "maxElapsed":
      if (state.phase !== "covered") return state;
      return { ...state, showCue: true };
    case "wipeOutDone":
      if (state.phase !== "revealing") return state;
      return { ...initialWipeState };
  }
}
