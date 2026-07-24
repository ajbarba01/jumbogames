/**
 * Motion constants: the rejection-shake amplitude crosses the CSS/JS seam as a
 * single kit constant (SLIP_SHAKE), so no consumer re-copies the keyframes.
 */
import { describe, expect, it } from "vitest";
import { SLIP_SHAKE } from "./index";

describe("SLIP_SHAKE", () => {
  it("is the register's rejection-shake keyframe array", () => {
    expect(SLIP_SHAKE).toEqual([0, -9, 8, -6, 5, -3, 0]);
  });

  it("starts and ends at rest so the element settles where it began", () => {
    expect(SLIP_SHAKE[0]).toBe(0);
    expect(SLIP_SHAKE[SLIP_SHAKE.length - 1]).toBe(0);
  });
});
