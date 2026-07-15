// @vitest-environment jsdom
/**
 * TextField: the kit's single-line text input. Focus cue is the container
 * border step-up; disabled and invalid faces are distinct states.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("renders a textbox that accepts typing", async () => {
    render(<TextField aria-label="Email" />);
    const el = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(el, "a@b.org");
    expect(el).toHaveValue("a@b.org");
  });

  it("wears the paper sticker face and leaves focus to the global ring", () => {
    render(<TextField aria-label="Email" />);
    const el = screen.getByRole("textbox", { name: "Email" });
    expect(el.className).toContain("sticker");
    expect(el.className).toContain("bg-s12");
    expect(el.className).not.toContain("outline-none");
  });

  it("disabled: no typing, no hover cue", async () => {
    render(<TextField aria-label="Email" disabled />);
    const el = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(el, "x");
    expect(el).toHaveValue("");
    expect(el.className).toContain("cursor-default");
    expect(el.className).not.toContain("hover:");
  });

  it("invalid: crit border", () => {
    render(<TextField aria-label="Email" invalid />);
    expect(screen.getByRole("textbox", { name: "Email" }).className).toContain(
      "border-crit",
    );
  });
});
