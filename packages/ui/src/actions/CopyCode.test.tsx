// @vitest-environment jsdom
/**
 * CopyCode: shows a code and copies it on click, announcing success through a
 * live region.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyCode } from "./CopyCode";

describe("CopyCode", () => {
  it("renders the code and a default copy label", () => {
    render(<CopyCode value="HACK42" />);
    expect(screen.getByText("HACK42")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy code HACK42" }),
    ).toBeInTheDocument();
  });

  it("copies the value to the clipboard and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyCode value="HACK42" />);
    await userEvent.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith("HACK42");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("exposes the code element via a passthrough test id", () => {
    render(<CopyCode value="HACK42" data-testid="game-code" />);
    expect(screen.getByTestId("game-code")).toHaveTextContent("HACK42");
  });
});
