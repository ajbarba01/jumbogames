// @vitest-environment jsdom
/** Field: labelling, the detail suffix, and helper/error precedence. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field";

describe("Field", () => {
  it("renders its label and children", () => {
    render(
      <Field label="Name">
        <input aria-label="Name input" />
      </Field>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Name input")).toBeInTheDocument();
  });

  it("renders the detail suffix beside the label", () => {
    render(
      <Field label="Minigames" detail="1 of 2 picked">
        <div />
      </Field>,
    );
    expect(screen.getByText("1 of 2 picked")).toBeInTheDocument();
  });

  it("shows the helper when there is no error", () => {
    render(
      <Field label="K" helper="Repeats fill in.">
        <div />
      </Field>,
    );
    expect(screen.getByText("Repeats fill in.")).toBeInTheDocument();
  });

  it("shows the error instead of the helper, as an alert", () => {
    render(
      <Field label="K" helper="Repeats fill in." error="Required">
        <div />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByText("Repeats fill in.")).not.toBeInTheDocument();
  });
});
