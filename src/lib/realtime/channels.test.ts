/**
 * Unit test for the Realtime channel naming convention shared by the server
 * broadcaster and the client subscriber.
 */
import { describe, it, expect } from "vitest";
import {
  tournamentChannel,
  matchChannel,
  MATCH_CHANGE_EVENT,
} from "./channels";

describe("tournamentChannel", () => {
  it("namespaces a channel by tournament id", () => {
    expect(tournamentChannel("t123")).toBe("tournament:t123");
  });
});

describe("matchChannel", () => {
  it("namespaces by match id", () => {
    expect(matchChannel("m1")).toBe("match:m1");
  });

  it("has a stable change event name", () => {
    expect(MATCH_CHANGE_EVENT).toBe("change");
  });
});
