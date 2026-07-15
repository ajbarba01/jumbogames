/** Guards the Toasted Arcade theme: perceptually-even scale, locked hue, WCAG
 *  contrast on the text band, halation-safe status hues, and a distinct 15-team
 *  palette. Reads the CSS and re-derives every property with color-math. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hexToOklch, wcagContrast, deltaE, simulateCvd } from "./color-math";

export function readTheme(): Record<string, string> {
  const css = readFileSync(
    fileURLToPath(new URL("./toasted-arcade.css", import.meta.url)),
    "utf8",
  );
  const map: Record<string, string> = {};
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    map[m[1]] = m[2].toLowerCase();
  }
  return map;
}

const t = readTheme();
const scale = Array.from({ length: 12 }, (_, i) => t[`s${i + 1}`]);

describe("theme scale (Direction B)", () => {
  it("defines all 12 steps plus a darker edge", () => {
    scale.forEach((hex, i) =>
      expect(hex, `s${i + 1}`).toMatch(/^#[0-9a-f]{6}$/),
    );
    expect(hexToOklch(t.edge).L).toBeLessThan(hexToOklch(scale[0]).L);
  });

  it("has a monotonic, band-even lightness ramp", () => {
    const L = scale.map((h) => hexToOklch(h).L);
    for (let i = 1; i < L.length; i++)
      expect(L[i], `s${i + 1}>s${i}`).toBeGreaterThan(L[i - 1]);
    // grounds s1..s6 step evenly and tight; text s7..s12 step evenly and wider.
    for (let i = 1; i <= 5; i++) expect(L[i] - L[i - 1]).toBeGreaterThan(0.03);
    for (let i = 1; i <= 5; i++) expect(L[i] - L[i - 1]).toBeLessThan(0.065);
    for (let i = 7; i <= 11; i++)
      expect(L[i] - L[i - 1]).toBeGreaterThan(0.055);
    for (let i = 7; i <= 11; i++) expect(L[i] - L[i - 1]).toBeLessThan(0.1);
  });

  it("locks hue to the warm family on chromatic mid steps", () => {
    for (let i = 2; i <= 9; i++) {
      const { H } = hexToOklch(scale[i]);
      expect(H, `s${i + 1} hue`).toBeGreaterThan(55);
      expect(H, `s${i + 1} hue`).toBeLessThan(82);
    }
  });

  it("passes WCAG on the text band over both grounds", () => {
    for (const g of [scale[0], scale[1]]) {
      expect(wcagContrast(t.s7, g)).toBeGreaterThanOrEqual(3.0); // muted step
      for (const s of [t.s8, t.s9, t.s10, t.s11, t.s12]) {
        expect(wcagContrast(s, g)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("status + accents", () => {
  it("keeps the accent pair unchanged", () => {
    expect(t.accent).toBe("#ffc900");
    expect(t["accent-2"]).toBe("#ff90e8");
  });

  it("holds status hues under the halation chroma ceiling but still loud", () => {
    const ceiling: Record<string, number> = {
      run: 0.13,
      warn: 0.14,
      ok: 0.14,
      crit: 0.16,
    };
    for (const [name, max] of Object.entries(ceiling)) {
      const { C } = hexToOklch(t[name]);
      expect(C, `${name} chroma`).toBeLessThanOrEqual(max);
      expect(C, `${name} chroma`).toBeGreaterThan(0.09); // still saturated
    }
  });

  it("keeps status legible on the darkest ground", () => {
    for (const name of ["run", "warn", "ok", "crit"]) {
      expect(wcagContrast(t[name], t.s1), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("15-team categorical palette", () => {
  const teams = Array.from({ length: 15 }, (_, i) => t[`team-${i + 1}`]);

  it("defines 15 team colors, each clearing identity contrast on s1", () => {
    teams.forEach((hex, i) => {
      expect(hex, `team-${i + 1}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(
        wcagContrast(hex, t.s1),
        `team-${i + 1} contrast`,
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  it("keeps every pair distinct for normal and colorblind vision", () => {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        expect(
          deltaE(teams[i], teams[j]),
          `${i + 1}vs${j + 1} normal`,
        ).toBeGreaterThan(0.1);
        const cvd = Math.min(
          deltaE(simulateCvd(teams[i], "deut"), simulateCvd(teams[j], "deut")),
          deltaE(simulateCvd(teams[i], "prot"), simulateCvd(teams[j], "prot")),
        );
        expect(cvd, `${i + 1}vs${j + 1} cvd`).toBeGreaterThan(0.02);
      }
    }
  });

  it("keeps team colors clear of the accent pair", () => {
    for (const hex of teams) {
      expect(deltaE(hex, t.accent)).toBeGreaterThan(0.1);
      expect(deltaE(hex, t["accent-2"])).toBeGreaterThan(0.1);
    }
  });
});
