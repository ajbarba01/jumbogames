// @vitest-environment jsdom
/**
 * ConfirmDialog: a titled modal gating a confirm. Confirm and cancel fire their
 * callbacks; busy locks both; closed renders nothing.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders the title and description in a labelled dialog", () => {
    render(
      <ConfirmDialog
        open
        title="End tournament?"
        description="This ends it for everyone."
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "End tournament?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This ends it for everyone.")).toBeInTheDocument();
  });

  it("confirm fires onConfirm; cancel fires onClose", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="End tournament?"
        confirmLabel="End tournament"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "End tournament" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("busy disables both actions", () => {
    render(
      <ConfirmDialog
        open
        busy
        title="End tournament?"
        confirmLabel="End tournament"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "End tournament" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("closed renders nothing", () => {
    render(
      <ConfirmDialog
        open={false}
        title="End tournament?"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
