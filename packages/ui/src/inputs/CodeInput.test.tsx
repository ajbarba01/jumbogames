// @vitest-environment jsdom
/**
 * CodeInput: the segmented fixed-length code entry. Each cell is its own input;
 * typing advances, backspace steps back, paste distributes, focus stays gapless,
 * and the joined value is uppercased. Caret and selection are the browser's.
 */
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CodeInput } from "./CodeInput";

/** A controlled harness so tests exercise the real value round-trip. */
function Harness({
  length,
  onComplete,
}: {
  length?: number;
  onComplete?: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <CodeInput
      aria-label="Game code"
      value={value}
      onChange={setValue}
      length={length}
      onComplete={onComplete}
    />
  );
}

describe("CodeInput", () => {
  it("renders one cell per length inside a labelled group", () => {
    render(<Harness length={6} />);
    expect(screen.getByRole("group", { name: "Game code" })).toBeTruthy();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("typing fills cells left to right, uppercasing, and builds the value", async () => {
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    await userEvent.keyboard("hack42");
    expect(cells.map((c) => c.value).join("")).toBe("HACK42");
    expect(document.activeElement).toBe(cells[5]);
  });

  it("advances focus to the next cell as each character lands", async () => {
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    await userEvent.keyboard("a");
    expect(document.activeElement).toBe(cells[1]);
  });

  it("backspace clears the current cell, then steps back into the previous one", async () => {
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    await userEvent.keyboard("ab");
    // Focus on cell 3 (empty); first backspace steps back and clears cell 2.
    await userEvent.keyboard("{Backspace}");
    expect(document.activeElement).toBe(cells[1]);
    expect(cells[1].value).toBe("");
    await userEvent.keyboard("{Backspace}");
    expect(document.activeElement).toBe(cells[0]);
    expect(cells[0].value).toBe("");
  });

  it("focusing a cell past the first gap jumps back to the first empty cell", () => {
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    fireEvent.change(cells[0], { target: { value: "a" } });
    fireEvent.change(cells[1], { target: { value: "b" } });
    cells[5].focus();
    expect(document.activeElement).toBe(cells[2]);
  });

  it("overtyping a filled cell replaces its character and advances", () => {
    // On focus the cell selects its char, so a keystroke replaces it; the
    // browser then dispatches a change with the single new character.
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    fireEvent.change(cells[0], { target: { value: "a" } });
    cells[0].focus();
    fireEvent.change(cells[0], { target: { value: "z" } });
    expect(cells[0].value).toBe("Z");
    expect(document.activeElement).toBe(cells[1]);
  });

  it("distributes a pasted code across the cells", async () => {
    render(<Harness length={6} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    await userEvent.paste("hack42");
    expect(cells.map((c) => c.value).join("")).toBe("HACK42");
  });

  it("fires onComplete once the final cell is filled", async () => {
    const onComplete = vi.fn();
    render(<Harness length={4} onComplete={onComplete} />);
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    cells[0].focus();
    await userEvent.keyboard("ab7");
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.keyboard("k");
    expect(onComplete).toHaveBeenCalledWith("AB7K");
  });

  it("shows a per-cell ghost placeholder before typing", () => {
    render(
      <CodeInput
        aria-label="Game code"
        value=""
        onChange={() => {}}
        placeholder="JUMBOS"
      />,
    );
    const cells = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(cells.map((c) => c.getAttribute("placeholder")).join("")).toBe(
      "JUMBOS",
    );
  });

  it("wears the paper sticker face, mono voice, and no focus opt-out", () => {
    render(<Harness />);
    const cell = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    expect(cell.className).toContain("sticker");
    expect(cell.className).toContain("bg-s12");
    expect(cell.className).toContain("font-mono");
    expect(cell.className).not.toContain("outline-none");
  });

  it("invalid: crit border on the cells", () => {
    render(
      <CodeInput aria-label="Game code" value="" onChange={() => {}} invalid />,
    );
    expect(
      (screen.getAllByRole("textbox")[0] as HTMLInputElement).className,
    ).toContain("border-crit");
  });

  it("disabled: no typing, no hover cue", async () => {
    render(
      <CodeInput
        aria-label="Game code"
        value=""
        onChange={() => {}}
        disabled
      />,
    );
    const cell = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    await userEvent.type(cell, "x");
    expect(cell.value).toBe("");
    expect(cell.className).not.toContain("hover:");
  });
});
