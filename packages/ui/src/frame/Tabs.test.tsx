// @vitest-environment jsdom
/** Tabs: selection state, disabled tabs, and arrow-key roving focus. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs";

const TABS = [
  { id: "board", label: "Board" },
  { id: "team", label: "My team" },
];

describe("Tabs", () => {
  it("marks the active tab selected and the others not", () => {
    render(
      <Tabs tabs={TABS} active="team" onSelect={() => {}} label="Game views" />,
    );
    expect(screen.getByRole("tab", { name: "My team" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("selects on click", async () => {
    const onSelect = vi.fn();
    render(
      <Tabs
        tabs={TABS}
        active="board"
        onSelect={onSelect}
        label="Game views"
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "My team" }));
    expect(onSelect).toHaveBeenCalledWith("team");
  });

  it("does not select a disabled tab, but still exposes it", async () => {
    const onSelect = vi.fn();
    const tabs = [{ id: "board", label: "Board", disabled: true }, TABS[1]];
    render(
      <Tabs tabs={tabs} active="team" onSelect={onSelect} label="Game views" />,
    );
    const board = screen.getByRole("tab", { name: "Board" });
    expect(board).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(board);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves selection and DOM focus with arrow keys, skipping disabled tabs", async () => {
    const onSelect = vi.fn();
    const tabs = [
      { id: "board", label: "Board", disabled: true },
      { id: "team", label: "My team" },
      { id: "chat", label: "Chat" },
    ];
    render(
      <Tabs tabs={tabs} active="team" onSelect={onSelect} label="Game views" />,
    );

    screen.getByRole("tab", { name: "My team" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("chat");
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveFocus();
    onSelect.mockClear();

    // Re-focus "My team" for a second, independent single-step lookup: Tabs
    // is controlled, so this render never gets a rerender with an updated
    // `active`, and the previous assertion already moved real DOM focus to
    // "Chat".
    screen.getByRole("tab", { name: "My team" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenCalledWith("chat"); // wraps past the disabled Board back to itself
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveFocus();
  });

  it("only the active tab is in the tab order", () => {
    render(
      <Tabs tabs={TABS} active="team" onSelect={() => {}} label="Game views" />,
    );
    expect(screen.getByRole("tab", { name: "My team" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
