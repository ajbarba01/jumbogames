// @vitest-environment jsdom
/** Behavioral tests for MenuItem selection state and the MenuCard + CapsLabel composition. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CapsLabel, MenuCard, MenuItem } from "./MenuCard";

describe("MenuItem", () => {
  it("selected renders the tint and the trailing check marker", () => {
    render(<MenuItem selected>Thunderbirds</MenuItem>);
    const el = screen.getByRole("button", { name: /Thunderbirds/ });
    expect(el.className).toContain("bg-s11");
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("unselected renders the accent-sweep hover and no marker", () => {
    render(<MenuItem>Ravens</MenuItem>);
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
    expect(screen.getByRole("button").className).toContain("hover:bg-accent");
  });

  it("disabled renders inert", () => {
    render(<MenuItem disabled>soon</MenuItem>);
    const el = screen.getByRole("button");
    expect(el).toBeDisabled();
    expect(el.className).toContain("cursor-default");
    expect(el.className).not.toContain("hover:");
  });
});

describe("MenuCard + CapsLabel", () => {
  it("compose a floating card with a section header", () => {
    render(
      <MenuCard data-testid="card">
        <CapsLabel>team</CapsLabel>
        <MenuItem>Thunderbirds</MenuItem>
      </MenuCard>,
    );
    expect(screen.getByTestId("card").className).toContain("shadow-float");
    expect(screen.getByText("team")).toBeInTheDocument();
  });
});
