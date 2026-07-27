// @vitest-environment jsdom
/**
 * Tier-1 optimism for trivia: tapping an answer locks the card immediately,
 * before any server frame arrives, and marks the tapped choice as pending
 * without claiming the answer was correct — the correct answer is redacted, so
 * the client cannot know. Correctness only appears once the server reveals it.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriviaPlay } from "./TriviaPlay";
import type { MatchView, SlotState } from "@jumbo/engine";

const CHOICES = ["Paris", "Lyon", "Nice", "Brest"];

const view = (): MatchView => ({
  match: {
    matchId: "m1",
    seed: "seed-1",
    teamA: { id: "ta", name: "Team A", colorIndex: 0, members: ["p1"] },
    teamB: { id: "tb", name: "Team B", colorIndex: 1, members: ["p2"] },
    slots: [],
  },
  viewerId: "p1",
  role: "player",
  playerLabels: { p1: "Ada", p2: "Grace" },
});

/** A slot mid-play with an unanswered card in front of the viewer. */
const openCard = (): SlotState => ({
  ordinal: 0,
  kind: "trivia",
  phase: "playing",
  ready: ["p1", "p2"],
  snapshot: { teamA: ["p1"], teamB: ["p2"] },
  countdownEndsAt: null,
  deadline: Date.now() + 60_000,
  scoringEndsAt: null,
  payload: {
    question: {
      deckIndex: 0,
      prompt: "Capital of France?",
      choices: CHOICES,
    },
    scores: { p1: 0, p2: 0 },
    rope: { value: 0, updatedAt: Date.now() },
    pinned: null,
    lastAnswer: null,
  },
  normA: null,
  normB: null,
  winner: null,
});

const props = (onAction: (a: unknown) => void) => ({
  view: view(),
  slot: openCard(),
  canAct: true,
  onAction,
  offsetMs: 0,
});

describe("TriviaPlay acknowledgement", () => {
  it("disables every choice as soon as one is tapped", async () => {
    const onAction = vi.fn();
    render(<TriviaPlay {...props(onAction)} />);
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    for (const label of CHOICES) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeDisabled();
    }
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("marks the tapped choice as pending, not as correct or wrong", async () => {
    render(<TriviaPlay {...props(vi.fn())} />);
    const choice = screen.getByRole("button", { name: /Paris/ });
    await userEvent.click(choice);

    expect(choice).toHaveAttribute("data-state", "pending");
    // The untouched choices stay idle — nothing is claimed about them either.
    expect(screen.getByRole("button", { name: /Lyon/ })).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("does not reveal the correct answer before the server does", async () => {
    render(<TriviaPlay {...props(vi.fn())} />);
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    // No choice may claim correctness while the answer is still redacted.
    for (const label of CHOICES) {
      const button = screen.getByRole("button", { name: new RegExp(label) });
      expect(button.getAttribute("data-state")).not.toBe("correct");
      expect(button.getAttribute("data-state")).not.toBe("wrong");
    }
  });
});
