// @vitest-environment jsdom
/** OptionCard: pressed state, toggle callback, and the disabled face. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionCard } from "./OptionCard";

describe("OptionCard", () => {
  it("exposes selection through aria-pressed", () => {
    render(<OptionCard title="Trivia" selected onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Trivia/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("is not pressed when unselected", () => {
    render(<OptionCard title="Trivia" selected={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Trivia/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<OptionCard title="Trivia" selected={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /Trivia/ }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("does not toggle when disabled", async () => {
    const onToggle = vi.fn();
    render(
      <OptionCard
        title="Trivia"
        selected={false}
        disabled
        onToggle={onToggle}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Trivia/ }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("renders its description", () => {
    render(
      <OptionCard
        title="Trivia"
        description="Answer fast, pull the rope"
        selected={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText("Answer fast, pull the rope")).toBeInTheDocument();
  });
});
