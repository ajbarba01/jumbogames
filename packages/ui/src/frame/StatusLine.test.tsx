// @vitest-environment jsdom
/** StatusLine: tone hue, the decorative dot, an inline action, and live mode. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusLine } from "./StatusLine";

describe("StatusLine", () => {
  it("renders its message", () => {
    render(<StatusLine>In a match</StatusLine>);
    expect(screen.getByText("In a match")).toBeInTheDocument();
  });

  it("carries the tone hue", () => {
    const { container } = render(<StatusLine tone="warn">Locked</StatusLine>);
    expect(container.firstChild).toHaveClass("text-warn");
  });

  it("defaults to the quiet info tone", () => {
    const { container } = render(<StatusLine>Waiting</StatusLine>);
    expect(container.firstChild).toHaveClass("text-s7");
  });

  it("renders an inline action", () => {
    render(
      <StatusLine action={<button type="button">Retry</button>}>
        Failed
      </StatusLine>,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("announces changes only when asked", () => {
    const { rerender, container } = render(<StatusLine>Quiet</StatusLine>);
    expect(container.firstChild).not.toHaveAttribute("role");
    rerender(<StatusLine live>Loud</StatusLine>);
    expect(screen.getByRole("status")).toHaveTextContent("Loud");
  });
});
