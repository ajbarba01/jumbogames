// @vitest-environment jsdom
/**
 * The play surface's answer feedback: tier-1 optimism on tap, the verdict that
 * follows, and the lockout a wrong answer buys. Covered here rather than in
 * E2E because all three are state-sequencing concerns — they depend on a held
 * card, a pushed payload and a release timer lining up — and Playwright can
 * only see the outcome.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriviaPlay } from "./TriviaPlay";
import { INITIAL_ROPE, INITIAL_TIER, ropeK } from "@jumbo/engine";
import type { MatchView, SlotState, TriviaView } from "@jumbo/engine";

const CHOICES: [string, string, string, string] = [
  "Paris",
  "Lyon",
  "Nice",
  "Brest",
];
const NOW = 1_700_000_000_000;

/** The verdict frame is the choice button's parent — the border lives there so
 *  the kit Button keeps its own faces. Asserted by class, since the colour is a
 *  CSS variable jsdom will not resolve. */
function frameOf(label: string): HTMLElement {
  const button = screen.getByRole("button", { name: new RegExp(label) });
  const frame = button.parentElement;
  if (!frame) throw new Error(`Choice ${label} has no verdict frame`);
  return frame;
}

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

const basePayload = (): TriviaView => ({
  rope: INITIAL_ROPE,
  tierA: INITIAL_TIER,
  tierB: INITIAL_TIER,
  k: ropeK(1, 1),
  pinned: null,
  scores: { p1: 0, p2: 0 },
  question: { deckIndex: 0, prompt: "Capital of France?", choices: CHOICES },
  answers: 0,
  lockedUntil: 0,
  lastResult: null,
});

/** A slot mid-play with an unanswered card in front of the viewer. */
const slotWith = (payload: TriviaView): SlotState => ({
  ordinal: 0,
  kind: "trivia",
  phase: "playing",
  ready: ["p1", "p2"],
  snapshot: { teamA: ["p1"], teamB: ["p2"] },
  countdownEndsAt: null,
  deadline: NOW + 60_000,
  scoringEndsAt: null,
  payload,
  normA: null,
  normB: null,
  winner: null,
});

const props = (payload: TriviaView, onAction: (a: unknown) => void) => ({
  view: view(),
  slot: slotWith(payload),
  canAct: true,
  onAction,
  offsetMs: 0,
});

describe("TriviaPlay acknowledgement", () => {
  it("disables every choice as soon as one is tapped", async () => {
    const onAction = vi.fn();
    render(<TriviaPlay {...props(basePayload(), onAction)} />);
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    for (const label of CHOICES) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeDisabled();
    }
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("marks the tapped choice as pending, not as correct or wrong", async () => {
    render(<TriviaPlay {...props(basePayload(), vi.fn())} />);
    const choice = screen.getByRole("button", { name: /Paris/ });
    await userEvent.click(choice);

    expect(choice).toHaveAttribute("data-state", "pending");
    // The untouched choices stay idle — nothing is claimed about them either.
    expect(screen.getByRole("button", { name: /Lyon/ })).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("does not reveal a verdict before the server sends one", async () => {
    render(<TriviaPlay {...props(basePayload(), vi.fn())} />);
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    for (const label of CHOICES) {
      const button = screen.getByRole("button", { name: new RegExp(label) });
      expect(button.getAttribute("data-state")).not.toBe("correct");
      expect(button.getAttribute("data-state")).not.toBe("wrong");
    }
  });
});

describe("TriviaPlay verdict", () => {
  it("flashes the picked choice green when the server says correct", async () => {
    const { rerender } = render(
      <TriviaPlay {...props(basePayload(), vi.fn())} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    const resolved: TriviaView = {
      ...basePayload(),
      scores: { p1: 1, p2: 0 },
      answers: 1,
      lastResult: "correct",
    };
    rerender(<TriviaPlay {...props(resolved, vi.fn())} />);

    expect(frameOf("Paris").className).toContain("border-ok");
  });

  it("reddens the picked choice when the server says wrong", async () => {
    const { rerender } = render(
      <TriviaPlay {...props(basePayload(), vi.fn())} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Lyon/ }));

    const resolved: TriviaView = {
      ...basePayload(),
      answers: 1,
      lastResult: "wrong",
      lockedUntil: NOW + 3000,
    };
    rerender(<TriviaPlay {...props(resolved, vi.fn())} />);

    expect(frameOf("Lyon").className).toContain("border-crit");
  });

  it("never marks a choice the viewer did not pick", async () => {
    const { rerender } = render(
      <TriviaPlay {...props(basePayload(), vi.fn())} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Paris/ }));

    const resolved: TriviaView = {
      ...basePayload(),
      answers: 1,
      lastResult: "correct",
    };
    rerender(<TriviaPlay {...props(resolved, vi.fn())} />);

    // The correct index never crosses the wire, so nothing may be claimed
    // about the three choices the player did not take.
    for (const label of ["Lyon", "Nice", "Brest"]) {
      expect(frameOf(label).className).toContain("border-transparent");
    }
  });
});

describe("TriviaPlay lockout", () => {
  it("holds the player out and says so while the lockout runs", () => {
    const locked: TriviaView = {
      ...basePayload(),
      answers: 1,
      lastResult: "wrong",
      lockedUntil: Date.now() + 3000,
    };
    render(<TriviaPlay {...props(locked, vi.fn())} />);

    expect(screen.getByText(/back in/i)).toBeInTheDocument();
    for (const label of CHOICES) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeDisabled();
    }
  });

  it("clears once the clock passes lockedUntil", () => {
    const free: TriviaView = {
      ...basePayload(),
      answers: 1,
      lastResult: "wrong",
      lockedUntil: Date.now() - 1,
    };
    render(<TriviaPlay {...props(free, vi.fn())} />);

    expect(screen.queryByText(/back in/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paris/ })).toBeEnabled();
  });
});

describe("TriviaPlay score line", () => {
  it("counts right answers rather than points", () => {
    const scored: TriviaView = { ...basePayload(), scores: { p1: 3, p2: 0 } };
    render(<TriviaPlay {...props(scored, vi.fn())} />);
    expect(screen.getByText("You · 3 right")).toBeInTheDocument();
  });
});
