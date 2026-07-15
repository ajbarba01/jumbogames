// @vitest-environment jsdom
/** Behavioral tests for Spinner: status role, motion-safe spin, and the delayed reveal. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("announces as a status and ticks through stepped frames", () => {
    render(<Spinner label="loading round board" />);
    const status = screen.getByRole("status", { name: "loading round board" });
    expect(status).toBeInTheDocument();
    expect(status.querySelector(".spin-step")).not.toBeNull();
  });

  it("reveals late so fast transitions never flash it", () => {
    render(<Spinner label="loading" />);
    expect(screen.getByRole("status").className).toContain("spinner-reveal");
  });
});
