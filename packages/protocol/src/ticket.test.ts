/**
 * Security tests for connect tickets: a freshly minted ticket verifies to its
 * claims, and expired, wrong-secret, and tampered tickets are all rejected.
 */
import { describe, expect, it } from "vitest";
import { signTicket, verifyTicket, TICKET_TTL_SECONDS } from "./ticket";

const SECRET = "test-secret-at-least-32-bytes-long-000";
const claims = { matchId: "m1", profileId: "p1", exp: 0 };

describe("connect tickets", () => {
  it("round-trips valid claims", async () => {
    const now = 1_000_000;
    const token = await signTicket(
      { ...claims, exp: now + TICKET_TTL_SECONDS },
      SECRET,
    );
    await expect(verifyTicket(token, SECRET, now)).resolves.toEqual({
      matchId: "m1",
      profileId: "p1",
      exp: now + TICKET_TTL_SECONDS,
    });
  });

  it("rejects a ticket past its expiry", async () => {
    const token = await signTicket({ ...claims, exp: 100 }, SECRET);
    await expect(verifyTicket(token, SECRET, 101)).resolves.toBeNull();
  });

  it("rejects a ticket signed with a different secret", async () => {
    const token = await signTicket({ ...claims, exp: 10_000 }, SECRET);
    await expect(
      verifyTicket(token, "another-secret-at-least-32-bytes-000", 0),
    ).resolves.toBeNull();
  });

  it("rejects a ticket whose payload was swapped", async () => {
    const a = await signTicket(
      { matchId: "m1", profileId: "victim", exp: 10_000 },
      SECRET,
    );
    const b = await signTicket(
      { matchId: "m1", profileId: "attacker", exp: 10_000 },
      SECRET,
    );
    const forged = `${b.split(".")[0]}.${b.split(".")[1]}.${a.split(".")[2]}`;
    await expect(verifyTicket(forged, SECRET, 0)).resolves.toBeNull();
  });
});
