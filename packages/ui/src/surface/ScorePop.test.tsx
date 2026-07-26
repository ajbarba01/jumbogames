// @vitest-environment jsdom
/** ScorePop: nothing before the first beat, sign-driven hue and glyph, and a
 *  decorative face — the score itself is read from the live text beside it. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScorePop } from "./ScorePop";

describe("ScorePop", () => {
  it("renders nothing before anything has landed", () => {
    const { container } = render(<ScorePop popKey={0} delta={3} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("signs a gain and wears the done hue", () => {
    render(<ScorePop popKey={1} delta={3} />);
    expect(screen.getByText("+3")).toHaveClass("text-ok");
  });

  it("signs a loss and wears the critical hue", () => {
    render(<ScorePop popKey={2} delta={-1} />);
    expect(screen.getByText("-1")).toHaveClass("text-crit");
  });

  it("is decorative — the score is announced by the text it annotates", () => {
    render(<ScorePop popKey={1} delta={3} />);
    expect(screen.getByText("+3")).toHaveAttribute("aria-hidden");
  });

  it("annotates in the hand voice, the doodle layer's face", () => {
    render(<ScorePop popKey={1} delta={3} />);
    expect(screen.getByText("+3")).toHaveClass("font-hand");
  });
});
