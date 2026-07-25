// @vitest-environment jsdom
/**
 * Component tests for the create-game form: validation blocks submit, and a
 * valid submit posts the picked pool and K. The wipe navigation is mocked —
 * this asserts the request the form makes, not the transition it triggers.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateForm } from "./create-form";

const navigate = vi.fn();
vi.mock("@/components/wipe/use-wipe-nav", () => ({
  useWipeNav: () => ({ navigate }),
}));
vi.mock("motion/react", () => ({
  motion: { form: "form" },
}));

const available = [
  { kind: "stub" as const, title: "Stub game", instructions: "A test game" },
  { kind: "trivia" as const, title: "Trivia", instructions: "Answer fast" },
];

beforeEach(() => {
  navigate.mockClear();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ tournament: { id: "game-1" } }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CreateForm", () => {
  it("blocks submit and shows an error when the name is empty", async () => {
    render(<CreateForm available={available} />);
    await userEvent.click(screen.getByRole("button", { name: "Create game" }));
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks submit when nothing is picked from a multi-game pool", async () => {
    render(<CreateForm available={available} />);
    await userEvent.type(
      screen.getByPlaceholderText("Thursday hacknight"),
      "Hacknight",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create game" }));
    expect(screen.getByText("Pick at least one minigame.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("auto-selects the only minigame when the registry offers one", () => {
    render(<CreateForm available={[available[0]]} />);
    expect(screen.getByRole("button", { name: /Stub game/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("posts the picked pool and K, then navigates to the new game", async () => {
    render(<CreateForm available={available} />);
    await userEvent.type(
      screen.getByPlaceholderText("Thursday hacknight"),
      "Hacknight",
    );
    await userEvent.click(screen.getByRole("button", { name: /Trivia/ }));

    // Drive K away from its default of "1" so the payload assertion below
    // proves the form reads the slider's live state (and converts it to a
    // number) rather than merely restating the default it started with.
    const slider = screen.getByRole("slider", { name: "Minigames per match" });
    await userEvent.click(slider);
    await userEvent.keyboard("{ArrowRight}");
    // The underlying range input's `value` is the stop *index* (0-based),
    // while `aria-valuetext` carries the mapped stop name — assert the name
    // to prove the index-to-K mapping moved, not just the raw index.
    expect(slider).toHaveAttribute("aria-valuetext", "2");

    await userEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      minigamesPerMatch: unknown;
    };
    expect(body).toEqual({
      name: "Hacknight",
      minigamesPerMatch: 2,
      pool: ["trivia"],
    });
    expect(typeof body.minigamesPerMatch).toBe("number");
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/t/game-1"));
  });

  it("surfaces a failed create instead of navigating", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid tournament" }),
    }) as unknown as typeof fetch;

    render(<CreateForm available={available} />);
    await userEvent.type(
      screen.getByPlaceholderText("Thursday hacknight"),
      "Hacknight",
    );
    await userEvent.click(screen.getByRole("button", { name: /Trivia/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid tournament"),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
