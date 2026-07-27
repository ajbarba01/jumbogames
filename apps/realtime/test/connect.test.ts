/**
 * Connect-path tests: a valid ticket for this match is admitted, and a missing,
 * expired, or wrong-match ticket is refused with a typed error frame rather
 * than being silently accepted.
 */
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signTicket } from "@jumbo/protocol";

const SECRET = "test-secret-at-least-32-bytes-000";

const connect = async (matchId: string, ticket: string | null) => {
  const url = new URL(`https://example.test/room/${matchId}`);
  if (ticket) url.searchParams.set("ticket", ticket);
  return SELF.fetch(url, { headers: { Upgrade: "websocket" } });
};

const firstFrame = (res: Response): Promise<unknown> =>
  new Promise((resolve) => {
    const ws = res.webSocket!;
    ws.accept();
    ws.addEventListener("message", (e) => resolve(JSON.parse(String(e.data))));
  });

describe("connect", () => {
  it("refuses a connection with no ticket", async () => {
    const res = await connect("m1", null);
    await expect(firstFrame(res)).resolves.toMatchObject({
      type: "error",
      reason: "unauthorized",
    });
  });

  it("refuses a ticket minted for a different match", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const ticket = await signTicket(
      { matchId: "other", profileId: "p1", exp },
      SECRET,
    );
    const res = await connect("m1", ticket);
    await expect(firstFrame(res)).resolves.toMatchObject({
      type: "error",
      reason: "unauthorized",
    });
  });

  it("refuses an expired ticket", async () => {
    const ticket = await signTicket(
      { matchId: "m1", profileId: "p1", exp: 1 },
      SECRET,
    );
    const res = await connect("m1", ticket);
    await expect(firstFrame(res)).resolves.toMatchObject({
      type: "error",
      reason: "unauthorized",
    });
  });

  // Guards the three tests above against passing vacuously: if the Worker
  // verified against some other secret, every ticket here would be
  // "unauthorized" and they would all pass while proving nothing. A valid
  // ticket must clear the gate and fail later, on the unreachable origin.
  it("admits a valid ticket past the gate and fails on hydrate instead", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const ticket = await signTicket(
      { matchId: "m1", profileId: "p1", exp },
      SECRET,
    );
    const res = await connect("m1", ticket);
    await expect(firstFrame(res)).resolves.toMatchObject({
      type: "error",
      reason: "hydrate-failed",
    });
  });
});
