/**
 * Motion constants: the rejection-shake amplitude crosses the CSS/JS seam as a
 * single kit constant (SLIP_SHAKE), so no consumer re-copies the keyframes.
 */
import { describe, expect, it } from "vitest";
import {
  POP_DUR,
  POP_RISE,
  POP_TILT,
  SLIP_EASE,
  SLIP_EASE_OUT,
  SLIP_SHAKE,
} from "./index";

describe("SLIP_SHAKE", () => {
  it("is the register's rejection-shake keyframe array", () => {
    expect(SLIP_SHAKE).toEqual([0, -9, 8, -6, 5, -3, 0]);
  });

  it("starts and ends at rest so the element settles where it began", () => {
    expect(SLIP_SHAKE[0]).toBe(0);
    expect(SLIP_SHAKE[SLIP_SHAKE.length - 1]).toBe(0);
  });

  it("keeps the pop moment's choreography on the JS side of the seam", () => {
    expect(POP_DUR).toBe(0.7);
    expect(POP_RISE).toBe(-22);
    expect(POP_TILT).toBe(6);
  });
});

describe("SLIP_EASE_OUT", () => {
  it("mirrors the --ease-slip token", () => {
    expect(SLIP_EASE_OUT).toEqual([0.22, 1, 0.36, 1]);
  });

  it("never leaves the [0,1] output range, unlike the overshooting SLIP_EASE", () => {
    expect(SLIP_EASE_OUT[1]).toBeLessThanOrEqual(1);
    expect(SLIP_EASE_OUT[3]).toBeLessThanOrEqual(1);
    expect(SLIP_EASE[1]).toBeGreaterThan(1);
  });
});
