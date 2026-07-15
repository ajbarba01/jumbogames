/** Unit tests for the pure OKLCH / WCAG / CVD color math used to grade the theme. */
import { describe, expect, it } from "vitest";
import { hexToOklch, wcagContrast, deltaE, simulateCvd } from "./color-math";

describe("color-math", () => {
  it("white on black is WCAG 21:1; identical colors are 1:1", () => {
    expect(wcagContrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(wcagContrast("#3e3225", "#3e3225")).toBeCloseTo(1, 5);
  });

  it("converts known hexes to OKLCH", () => {
    const white = hexToOklch("#ffffff");
    expect(white.L).toBeCloseTo(1, 2);
    expect(white.C).toBeLessThan(0.01);
    const red = hexToOklch("#ff0000");
    expect(red.L).toBeGreaterThan(0.6);
    expect(red.L).toBeLessThan(0.65);
    expect(red.H).toBeGreaterThan(25);
    expect(red.H).toBeLessThan(33);
  });

  it("deltaE is 0 for identical colors and ~1 for black↔white", () => {
    expect(deltaE("#123456", "#123456")).toBeCloseTo(0, 5);
    expect(deltaE("#000000", "#ffffff")).toBeCloseTo(1, 1);
  });

  it("CVD simulation collapses a red/green pair", () => {
    const normal = deltaE("#ff0000", "#00ff00");
    const cvd = deltaE(
      simulateCvd("#ff0000", "deut"),
      simulateCvd("#00ff00", "deut"),
    );
    expect(cvd).toBeLessThan(normal);
    expect(simulateCvd("#ff0000", "deut")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
