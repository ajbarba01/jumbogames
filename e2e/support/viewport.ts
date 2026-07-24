/**
 * E2E support: the floor-width guard behind the fluid law (docs/UI.md). A
 * surface that renders wider than the viewport makes the whole page scroll
 * sideways on a phone — the class of bug that shipped in CodeInput and in the
 * home identity row. jsdom has no layout, so unit tests cannot catch it; this
 * runs in a real browser and fails CI instead.
 */
import { expect, type Page } from "@playwright/test";

/** The narrowest viewport the app is authored against (docs/UI.md). */
export const FLOOR_WIDTH = 375;
const FLOOR_HEIGHT = 812;

/**
 * Asserts the surface currently loaded in `page` does not scroll horizontally
 * at the floor width, then restores the previous viewport so the caller's
 * remaining steps run at their original size. `label` names the surface in the
 * failure message, since one spec may check several.
 */
export async function expectNoHorizontalOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const previous = page.viewportSize();
  await page.setViewportSize({ width: FLOOR_WIDTH, height: FLOOR_HEIGHT });

  // Poll rather than read once: a reflow after the resize (fonts, images, a
  // Realtime update landing) can settle a frame late.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      {
        message: `${label} scrolls horizontally at ${FLOOR_WIDTH}px — no surface may exceed the floor width (docs/UI.md)`,
      },
    )
    .toBeLessThanOrEqual(0);

  if (previous) await page.setViewportSize(previous);
}
