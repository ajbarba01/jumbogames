/**
 * Unit tests for resolveViewer and holdsGameCode: the pure access predicates
 * behind tournament reads. resolveViewer decides a viewer's relation to a
 * tournament (host / member / admin / guest) and the orthogonal `canHost`
 * (may exercise host controls, shared with isGameHost) — every viewer is
 * admitted, since reads are open to any signed-in user (DESIGN.md decision
 * 16, spectate by link). holdsGameCode decides the separate question of
 * whether that viewer may also see the game's write credential (the code).
 */
import { describe, it, expect } from "vitest";
import { resolveViewer, holdsGameCode } from "./viewer";

const HOST = "host-id";
const MEMBER = "member-id";
const STRANGER = "stranger-id";

const BASE = { hostId: HOST, memberIds: [MEMBER] } as const;

describe("resolveViewer", () => {
  it("admits the host, who holds no member row", () => {
    expect(
      resolveViewer({ ...BASE, viewerId: HOST, viewerRole: "player" }),
    ).toEqual({ as: "host", canHost: true });
  });

  it("resolves a host who also joined a team as host, not member", () => {
    expect(
      resolveViewer({
        viewerId: HOST,
        viewerRole: "player",
        hostId: HOST,
        memberIds: [HOST, MEMBER],
      }),
    ).toEqual({ as: "host", canHost: true });
  });

  it("admits a tournament member", () => {
    expect(
      resolveViewer({ ...BASE, viewerId: MEMBER, viewerRole: "player" }),
    ).toEqual({ as: "member", canHost: false });
  });

  it("admits a non-host admin as admin, and lets them host as a rescue path", () => {
    expect(
      resolveViewer({ ...BASE, viewerId: STRANGER, viewerRole: "admin" }),
    ).toEqual({ as: "admin", canHost: true });
  });

  it("admits an owner as admin, and lets them host as a rescue path", () => {
    expect(
      resolveViewer({ ...BASE, viewerId: STRANGER, viewerRole: "owner" }),
    ).toEqual({ as: "admin", canHost: true });
  });

  it("resolves an admin who is also a member as member (more specific), but still lets them host", () => {
    expect(
      resolveViewer({ ...BASE, viewerId: MEMBER, viewerRole: "admin" }),
    ).toEqual({ as: "member", canHost: true });
  });

  it("admits a stranger as a guest once the lobby has closed", () => {
    const relation = resolveViewer({
      viewerId: "stranger",
      viewerRole: "player",
      hostId: "host",
      memberIds: ["m1"],
    });
    expect(relation).toEqual({ as: "guest", canHost: false });
  });

  it("keeps host precedence over membership for the creator", () => {
    const relation = resolveViewer({
      viewerId: "host",
      viewerRole: "player",
      hostId: "host",
      memberIds: ["host"],
    });
    expect(relation).toEqual({ as: "host", canHost: true });
  });

  it("still reports canHost for an admin who is only a spectator", () => {
    const relation = resolveViewer({
      viewerId: "staff",
      viewerRole: "admin",
      hostId: "host",
      memberIds: [],
    });
    expect(relation).toEqual({ as: "admin", canHost: true });
  });
});

describe("holdsGameCode", () => {
  const GAME_CODE = "ABC234";

  it("lets the host see the code without presenting it", () => {
    expect(holdsGameCode({ as: "host", canHost: true }, GAME_CODE, null)).toBe(
      true,
    );
  });

  it("lets a member see the code without presenting it", () => {
    expect(
      holdsGameCode({ as: "member", canHost: false }, GAME_CODE, null),
    ).toBe(true);
  });

  it("lets an admin who can host see the code without presenting it", () => {
    expect(holdsGameCode({ as: "admin", canHost: true }, GAME_CODE, null)).toBe(
      true,
    );
  });

  it("refuses a stranger who presents no code", () => {
    expect(
      holdsGameCode({ as: "guest", canHost: false }, GAME_CODE, null),
    ).toBe(false);
  });

  it("admits a stranger who presents the right code", () => {
    expect(
      holdsGameCode({ as: "guest", canHost: false }, GAME_CODE, GAME_CODE),
    ).toBe(true);
  });

  it("refuses a stranger who presents the wrong code", () => {
    expect(
      holdsGameCode({ as: "guest", canHost: false }, GAME_CODE, "ZZZ999"),
    ).toBe(false);
  });

  it("admits a stranger who presents the right code in a different case", () => {
    expect(
      holdsGameCode(
        { as: "guest", canHost: false },
        GAME_CODE,
        GAME_CODE.toLowerCase(),
      ),
    ).toBe(true);
  });
});
