// @vitest-environment jsdom
/** Behavioral tests for Toggle: checked state, accent fill, disabled, and keyboard toggling. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("reflects state via aria-checked and reports the flipped value", () => {
    const onChange = vi.fn();
    render(
      <Toggle on={false} onChange={onChange} aria-label="reduce motion" />,
    );
    const el = screen.getByRole("switch", { name: "reduce motion" });
    expect(el).toHaveAttribute("aria-checked", "false");
    fireEvent.click(el);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("on renders the accent fill, never a status hue", () => {
    render(<Toggle on onChange={() => {}} aria-label="x" />);
    const el = screen.getByRole("switch");
    expect(el).toHaveAttribute("aria-checked", "true");
    expect(el.className).toContain("bg-accent");
    expect(el.className).not.toContain("bg-run");
  });

  it("disabled is inert and shows no pointer affordance", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} disabled aria-label="x" />);
    const el = screen.getByRole("switch");
    fireEvent.click(el);
    expect(onChange).not.toHaveBeenCalled();
    expect(el).toBeDisabled();
    expect(el.className).toContain("cursor-default");
    expect(el.className).not.toContain("hover:");
  });

  it("keyboard toggles (space/enter are Base UI mechanics on a native button)", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} aria-label="x" />);
    const el = screen.getByRole("switch");
    el.focus();
    fireEvent.click(el, { detail: 0 }); // keyboard activation arrives as a detail-0 click on native buttons
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
