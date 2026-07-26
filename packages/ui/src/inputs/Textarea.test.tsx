// @vitest-environment jsdom
/**
 * Textarea specs: the paper entry face, the invalid face, the disabled face,
 * and that it forwards the caller's accessible name and value handler.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("keeps the caller's accessible name and reports typing", async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="Prompt" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Prompt"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("wears the crit border when invalid", () => {
    render(<Textarea aria-label="Prompt" invalid readOnly value="" />);
    expect(screen.getByLabelText("Prompt").className).toContain("border-crit");
  });

  it("drops the hover affordance when disabled", () => {
    render(<Textarea aria-label="Prompt" disabled readOnly value="" />);
    const el = screen.getByLabelText("Prompt");
    expect(el).toBeDisabled();
    expect(el.className).not.toContain("sticker-hover");
  });
});
