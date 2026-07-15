/**
 * Unit test for the Realtime channel naming convention shared by the server
 * broadcaster and the client subscriber.
 */
import { describe, it, expect } from "vitest";
import { tournamentChannel } from "./channels";

describe("tournamentChannel", () => {
  it("namespaces a channel by tournament id", () => {
    expect(tournamentChannel("t123")).toBe("tournament:t123");
  });
});
