/** Guards the single-source-of-truth theme: no code references the removed
 *  legacy reference theme, and its stylesheet is gone. The forbidden token is
 *  assembled at runtime so this guard file never trips its own check. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Assembled, never written as a literal, so walking THIS file does not match.
const LEGACY = ["sand", "dark"].join("-");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = `${dir}/${name}`;
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("legacy theme removal", () => {
  const srcRoot = fileURLToPath(new URL("../", import.meta.url));

  it("no longer ships the legacy theme stylesheet", () => {
    const url = new URL(`./${LEGACY}.css`, import.meta.url);
    expect(existsSync(fileURLToPath(url))).toBe(false);
  });

  it("has no legacy-theme references in packages/ui/src", () => {
    for (const file of walk(srcRoot)) {
      if (!/\.(ts|tsx|css)$/.test(file)) continue;
      expect(readFileSync(file, "utf8").toLowerCase(), file).not.toContain(
        LEGACY,
      );
    }
  });
});
