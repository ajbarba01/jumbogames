// @vitest-environment jsdom
/** Behavioral tests for DialogSearchHead, TocRail, and SettingRow. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DialogSearchHead, SettingRow, TocRail } from "./SettingsFrame";

describe("DialogSearchHead", () => {
  it("reports typing and close", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <DialogSearchHead
        value=""
        onChange={onChange}
        onClose={onClose}
        placeholder="search settings…"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("search settings…"), {
      target: { value: "theme" },
    });
    expect(onChange).toHaveBeenCalledWith("theme");
    fireEvent.click(screen.getByRole("button", { name: "close settings" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("TocRail", () => {
  it("marks the active entry and jumps on click; null active marks nothing", () => {
    const onJump = vi.fn();
    const entries = [
      { id: "appearance", title: "appearance" },
      { id: "daemon", title: "daemon" },
    ];
    const classTokens = (): string[] =>
      screen.getByRole("button", { name: "appearance" }).className.split(/\s+/);
    const { rerender } = render(
      <TocRail entries={entries} activeId="appearance" onJump={onJump} />,
    );
    expect(classTokens()).toContain("bg-s11");
    fireEvent.click(screen.getByRole("button", { name: "daemon" }));
    expect(onJump).toHaveBeenCalledWith("daemon");
    rerender(<TocRail entries={entries} activeId={null} onJump={onJump} />);
    // exact token check — the hover variant `hover:bg-accent` must not satisfy this
    expect(classTokens()).not.toContain("bg-s11");
  });
});

describe("SettingRow", () => {
  it("lays out name, description, and the control slot", () => {
    render(
      <SettingRow name="Theme" desc="Palette scale for the whole app.">
        <button type="button">control</button>
      </SettingRow>,
    );
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(
      screen.getByText("Palette scale for the whole app."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "control" })).toBeInTheDocument();
  });
});
