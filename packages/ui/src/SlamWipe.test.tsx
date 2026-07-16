// @vitest-environment jsdom
/** Smoke tests for SlamWipe: it renders a covering panel on the wipe layer, and
 *  the label and still-loading cue appear only when asked for. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SlamWipe } from "./SlamWipe";

describe("SlamWipe", () => {
  it("renders a covering accent panel on the wipe layer", () => {
    const { container } = render(<SlamWipe phase="covered" />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain("bg-accent-2");
    expect(panel.className).toContain("z-(--z-wipe)");
  });

  it("shows the destination label only when given one", () => {
    const { rerender } = render(<SlamWipe phase="covered" />);
    expect(screen.queryByText("Round 1")).toBeNull();
    rerender(<SlamWipe phase="covered" label="Round 1" />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });

  it("shows the still-loading cue only when flagged", () => {
    const { rerender } = render(<SlamWipe phase="covered" />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<SlamWipe phase="covered" showCue />);
    expect(
      screen.getByRole("status", { name: "Still loading" }),
    ).toBeInTheDocument();
  });
});
