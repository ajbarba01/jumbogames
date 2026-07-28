/**
 * issueTicket must mint a ticket that verifies for exactly the caller-supplied
 * match/profile with an ~60s absolute-epoch exp, and both helpers must refuse
 * to run with their required env var unset rather than silently degrade.
 * socketUrlFor must turn the public http(s) Worker origin into a wss:// room URL.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { verifyTicket, TICKET_TTL_SECONDS } from "@jumbo/protocol";
import { issueTicket, socketUrlFor } from "./ticket";

const SECRET = "test-secret-at-least-32-bytes-long-000";

describe("issueTicket", () => {
  const originalSecret = process.env.REALTIME_TICKET_KEY;

  beforeEach(() => {
    process.env.REALTIME_TICKET_KEY = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.REALTIME_TICKET_KEY;
    } else {
      process.env.REALTIME_TICKET_KEY = originalSecret;
    }
  });

  it("mints a ticket that verifies for the given match and profile", async () => {
    const ticket = await issueTicket("match-1", "profile-1");
    const claims = await verifyTicket(ticket, SECRET);
    expect(claims).not.toBeNull();
    expect(claims?.matchId).toBe("match-1");
    expect(claims?.profileId).toBe("profile-1");
  });

  it("sets exp to an absolute epoch-seconds timestamp ~TICKET_TTL_SECONDS out", async () => {
    const before = Math.floor(Date.now() / 1000);
    const ticket = await issueTicket("match-1", "profile-1");
    const claims = await verifyTicket(ticket, SECRET);
    const after = Math.floor(Date.now() / 1000);
    expect(claims).not.toBeNull();
    expect(claims!.exp).toBeGreaterThanOrEqual(before + TICKET_TTL_SECONDS);
    expect(claims!.exp).toBeLessThanOrEqual(after + TICKET_TTL_SECONDS + 1);
  });

  it("does not verify against a different secret", async () => {
    const ticket = await issueTicket("match-1", "profile-1");
    const claims = await verifyTicket(
      ticket,
      "a-completely-different-secret!!",
    );
    expect(claims).toBeNull();
  });

  it("throws when REALTIME_TICKET_KEY is not set", async () => {
    delete process.env.REALTIME_TICKET_KEY;
    await expect(issueTicket("match-1", "profile-1")).rejects.toThrow(
      "REALTIME_TICKET_KEY is not set",
    );
  });
});

describe("socketUrlFor", () => {
  const originalUrl = process.env.NEXT_PUBLIC_REALTIME_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_REALTIME_URL;
    } else {
      process.env.NEXT_PUBLIC_REALTIME_URL = originalUrl;
    }
  });

  it("turns an http origin into a ws room URL", () => {
    process.env.NEXT_PUBLIC_REALTIME_URL = "http://localhost:8787";
    expect(socketUrlFor("match-1")).toBe("ws://localhost:8787/room/match-1");
  });

  it("turns an https origin into a wss room URL", () => {
    process.env.NEXT_PUBLIC_REALTIME_URL =
      "https://jumbogames-realtime.workers.dev";
    expect(socketUrlFor("match-1")).toBe(
      "wss://jumbogames-realtime.workers.dev/room/match-1",
    );
  });

  it("throws when NEXT_PUBLIC_REALTIME_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_REALTIME_URL;
    expect(() => socketUrlFor("match-1")).toThrow(
      "NEXT_PUBLIC_REALTIME_URL is not set",
    );
  });
});
