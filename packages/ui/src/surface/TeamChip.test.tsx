// @vitest-environment jsdom
/** TeamChip: the name always travels with the swatch, the swatch is
 *  decorative, the name is the child that truncates, and sizes step. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamChip } from "./TeamChip";

describe("TeamChip", () => {
  it("renders the team name", () => {
    render(<TeamChip colorIndex={3} name="Rocketeers" />);
    expect(screen.getByText("Rocketeers")).toBeInTheDocument();
  });

  it("paints the swatch from the team palette token", () => {
    const { container } = render(<TeamChip colorIndex={7} name="Segfaults" />);
    const swatch = container.querySelector("[aria-hidden]");
    expect(swatch).toHaveStyle({ background: "var(--color-team-7)" });
  });

  it("hides the swatch from assistive tech, so colour never carries meaning alone", () => {
    const { container } = render(<TeamChip colorIndex={1} name="Byte Me" />);
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
    expect(screen.getByText("Byte Me")).not.toHaveAttribute("aria-hidden");
  });

  it("makes the name the child that loses width, not the swatch", () => {
    const { container } = render(
      <TeamChip colorIndex={1} name="A very long team name" />,
    );
    const swatch = container.querySelector("[aria-hidden]");
    expect(swatch).toHaveClass("flex-none");
    expect(screen.getByText("A very long team name")).toHaveClass("truncate");
    expect(screen.getByText("A very long team name")).toHaveClass("min-w-0");
  });

  it("steps its type and swatch with size", () => {
    const { container: xs } = render(
      <TeamChip colorIndex={1} name="X" size="xs" />,
    );
    const { container: lg } = render(
      <TeamChip colorIndex={1} name="Y" size="lg" />,
    );
    expect(xs.querySelector("[aria-hidden]")).toHaveClass("h-2.5");
    expect(lg.querySelector("[aria-hidden]")).toHaveClass("h-5");
  });

  it("reverses for a right-aligned end so the swatch sits outboard", () => {
    const { container } = render(<TeamChip colorIndex={1} name="Z" reverse />);
    expect(container.firstChild).toHaveClass("flex-row-reverse");
  });
});
