/**
 * Client-side minigame registry: kind → play surface. Kept apart from the
 * server registry so pure reducers never import React.
 */
import type { ComponentType } from "react";
import type { MatchView } from "@/lib/match/client";
import type { SlotState } from "@jumbo/engine";
import type { MinigameKind } from "@jumbo/engine";
import { StubPlay } from "./StubPlay";
import { TriviaPlay } from "./trivia/TriviaPlay";

export interface MinigamePlayProps {
  view: MatchView;
  slot: SlotState;
  canAct: boolean;
  onAction: (action: unknown) => void;
  // Estimated serverClock - clientClock; add to Date.now() before comparing
  // against a server timestamp such as slot.deadline.
  offsetMs: number;
}

export const MINIGAME_SURFACES: Record<
  MinigameKind,
  ComponentType<MinigamePlayProps>
> = {
  stub: StubPlay,
  trivia: TriviaPlay,
};
