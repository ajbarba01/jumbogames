/**
 * Unit tests for resolveViewer: the pure access predicate deciding whether a
 * viewer may read a tournament, and in what relation (host / member / admin /
 * guest). Guest admission is gated on `joinable` — the lobby-open phase.
 */
import { describe, it, expect } from "vitest";
import { resolveViewer } from "./viewer";

const HOST = "host-id";
const MEMBER = "member-id";
const STRANGER = "stranger-id";

// A started tournament: no longer joinable by code, so the strict gate applies.
const LOCKED = { hostId: HOST, memberIds: [MEMBER], joinable: false } as const;

describe("resolveViewer", () => {
  it("admits the host, who holds no member row", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: HOST, viewerRole: "player" }),
    ).toEqual({ allowed: true, as: "host" });
  });

  it("resolves a host who also joined a team as host, not member", () => {
    expect(
      resolveViewer({
        viewerId: HOST,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [HOST, MEMBER],
        joinable: false,
      }),
    ).toEqual({ allowed: true, as: "host" });
  });

  it("admits a tournament member", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: MEMBER, viewerRole: "player" }),
    ).toEqual({ allowed: true, as: "member" });
  });

  it("admits a non-host admin as admin", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: STRANGER, viewerRole: "admin" }),
    ).toEqual({ allowed: true, as: "admin" });
  });

  it("admits an owner as admin", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: STRANGER, viewerRole: "owner" }),
    ).toEqual({ allowed: true, as: "admin" });
  });

  it("resolves an admin who is also a member as member (more specific)", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: MEMBER, viewerRole: "admin" }),
    ).toEqual({ allowed: true, as: "member" });
  });

  it("refuses a signed-in player with no tie once the tournament is locked", () => {
    expect(
      resolveViewer({ ...LOCKED, viewerId: STRANGER, viewerRole: "player" }),
    ).toEqual({ allowed: false });
  });

  it("refuses a plain player against an empty locked roster", () => {
    expect(
      resolveViewer({
        viewerId: STRANGER,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [],
        joinable: false,
      }),
    ).toEqual({ allowed: false });
  });

  it("admits any signed-in user as guest while the lobby is joinable", () => {
    expect(
      resolveViewer({
        viewerId: STRANGER,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [MEMBER],
        joinable: true,
      }),
    ).toEqual({ allowed: true, as: "guest" });
  });

  it("still resolves the host as host in a joinable lobby, not guest", () => {
    expect(
      resolveViewer({
        viewerId: HOST,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [],
        joinable: true,
      }),
    ).toEqual({ allowed: true, as: "host" });
  });

  it("still resolves a member as member in a joinable lobby, not guest", () => {
    expect(
      resolveViewer({
        viewerId: MEMBER,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [MEMBER],
        joinable: true,
      }),
    ).toEqual({ allowed: true, as: "member" });
  });
});
