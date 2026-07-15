// @vitest-environment jsdom
/** Behavioral tests for Tooltip: focus/blur visibility, keybind chips, and the floating-surface skin. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipProvider } from "./Tooltip";

function Host({ keys }: { keys?: string[] }): React.JSX.Element {
  return (
    <TooltipProvider>
      <Tooltip label="search matches" keys={keys}>
        <button type="button" aria-label="search matches">
          ⌕
        </button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("shows on keyboard focus and hides on blur", async () => {
    const user = userEvent.setup();
    render(<Host />);
    expect(screen.queryByText("search matches")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText("search matches")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByText("search matches")).not.toBeInTheDocument();
  });

  it("renders the keybind as kbd chips", async () => {
    const user = userEvent.setup();
    render(<Host keys={["ctrl", "p"]} />);
    await user.tab();
    const chips = screen.getAllByText(/ctrl|p/, { selector: "kbd" });
    expect(chips).toHaveLength(2);
  });

  it("wears the paper-sticker skin at the tooltip z", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.tab();
    const popup = screen.getByText("search matches");
    expect(popup.className).toContain("bg-s12");
    expect(popup.className).toContain("sticker");
    expect(popup.closest(".z-\\(--z-tooltip\\)")).not.toBeNull();
  });
});
