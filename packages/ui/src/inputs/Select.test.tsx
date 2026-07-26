// @vitest-environment jsdom
/** Behavioral tests for Select: open/pick/close, Escape via the kit layer stack, selection state,
 *  the chip/field size variant, and the disabled face. */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const OPTIONS = ["sand dark", "sand light", "system"] as const;

describe("Select", () => {
  it("opens on trigger, marks the current value, picks and closes", () => {
    const onChange = vi.fn();
    render(
      <Select
        options={OPTIONS}
        value="sand dark"
        onChange={onChange}
        aria-label="theme"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "theme" }));
    expect(screen.getByText("✓")).toBeInTheDocument();
    // a real mouse selection starts on the item — Base UI ignores clicks that don't
    const option = screen.getByRole("option", { name: /system/ });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("system");
    expect(
      screen.queryByRole("option", { name: /system/ }),
    ).not.toBeInTheDocument();
  });

  it("Escape closes the open popup through the kit layer stack (real bubble path)", () => {
    render(
      <Select
        options={OPTIONS}
        value="system"
        onChange={() => {}}
        aria-label="theme"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "theme" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("reflects selection state on the option rows", () => {
    render(
      <Select
        options={OPTIONS}
        value="sand light"
        onChange={() => {}}
        aria-label="theme"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "theme" }));
    const selected = screen.getByRole("option", { name: /sand light/ });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /system/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("keeps the chip face by default", () => {
    render(
      <Select
        options={["a", "b"]}
        value="a"
        onChange={() => {}}
        aria-label="Pick"
      />,
    );
    expect(screen.getByLabelText("Pick").className).toContain("bg-accent");
  });

  it("wears the field face and the caller's width at size=field", () => {
    render(
      <Select
        options={["a", "b"]}
        value="a"
        onChange={() => {}}
        size="field"
        className="flex-1"
        aria-label="Pick"
      />,
    );
    const trigger = screen.getByLabelText("Pick");
    // The caller's width wins, and the field face is the board sticker sized to
    // sit in a form row — not the compact accent chip.
    expect(trigger.className).toContain("flex-1");
    expect(trigger.className).not.toContain("bg-accent");
    for (const cls of [
      "bg-s2",
      "rounded-r2",
      "justify-between",
      "min-w-0",
      "px-4",
    ]) {
      expect(trigger.className).toContain(cls);
    }
    // Only the field face splits the value from the marker, so a long value can
    // truncate while the caret holds its width.
    expect(trigger.querySelector(".truncate")).not.toBeNull();
    expect(trigger.querySelector(".shrink-0")).not.toBeNull();
  });

  it("refuses to open when disabled", async () => {
    render(
      <Select
        options={["a", "b"]}
        value="a"
        onChange={() => {}}
        disabled
        aria-label="Pick"
      />,
    );
    const trigger = screen.getByLabelText("Pick");
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole("option", { name: "b" })).not.toBeInTheDocument();
  });
});
