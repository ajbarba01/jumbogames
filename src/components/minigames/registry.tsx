/**
 * Client-side minigame registry: kind → everything React knows how to draw for
 * that game. Kept apart from the server registry so pure reducers never import
 * React; the server half owns a game's text (title, tagline, instructions),
 * this half owns its pictures.
 *
 * A game contributes three views of itself, and they are deliberately levels of
 * detail on one idea rather than three unrelated assets: the Emblem is the
 * silhouette (create-form chip, slot card, reveal reel), the Demo animates that
 * silhouette's own parts to teach the rules at the gate, and Play is the real
 * thing. All three are required — a game with no Emblem would be a nameless
 * card in the reveal, and one with no Demo would be a wall of text at the gate.
 */
import type { ComponentType } from "react";
import type { MatchView } from "@/lib/match/client";
import type { MatchTeam, SlotState } from "@jumbo/engine";
import type { MinigameKind } from "@jumbo/engine";
import { StubPlay } from "./StubPlay";
import { StubEmblem } from "./StubEmblem";
import { StubDemo } from "./StubDemo";
import { TriviaPlay } from "./trivia/TriviaPlay";
import { TriviaEmblem } from "./trivia/Emblem";
import { TriviaDemo } from "./trivia/Demo";

export interface MinigamePlayProps {
  view: MatchView;
  slot: SlotState;
  canAct: boolean;
  onAction: (action: unknown) => void;
  // Estimated serverClock - clientClock; add to Date.now() before comparing
  // against a server timestamp such as slot.deadline.
  offsetMs: number;
}

/** Sized by the caller through `className`; the mark itself is unitless. */
export interface MinigameEmblemProps {
  className?: string;
}

export interface MinigameDemoProps {
  // The viewer's real teams, so the demo teaches which wall is theirs. Nothing
  // here is live — the gate has no play state yet, and the demo drives itself
  // off its own clock.
  teamA: MatchTeam;
  teamB: MatchTeam;
}

export interface MinigamePresentation {
  Play: ComponentType<MinigamePlayProps>;
  Emblem: ComponentType<MinigameEmblemProps>;
  Demo: ComponentType<MinigameDemoProps>;
}

export const MINIGAME_SURFACES: Record<MinigameKind, MinigamePresentation> = {
  stub: { Play: StubPlay, Emblem: StubEmblem, Demo: StubDemo },
  trivia: { Play: TriviaPlay, Emblem: TriviaEmblem, Demo: TriviaDemo },
};

/**
 * The emblem for a kind, looked up here so callers pass a kind rather than
 * reaching into the registry and destructuring a capitalised component out of
 * it at every call site.
 */
export function MinigameEmblem({
  kind,
  className,
}: {
  kind: MinigameKind;
  className?: string;
}): React.JSX.Element {
  const { Emblem } = MINIGAME_SURFACES[kind];
  return <Emblem className={className} />;
}
