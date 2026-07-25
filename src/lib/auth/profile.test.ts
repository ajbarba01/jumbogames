/**
 * Unit tests for the pure authorization predicates in the profile module.
 * Host powers belong to a game's creator or to any admin/owner, so a stuck
 * game can be rescued by a lead when the creator drops off.
 */
import { describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/client";
import { isGameHost } from "./profile";

function profileOf(id: string, role: Role): Profile {
  return {
    id,
    email: `${id}@test.example.com`,
    displayName: id,
    role,
    createdAt: new Date(),
  } as Profile;
}

describe("isGameHost", () => {
  it("passes the creator", () => {
    expect(isGameHost(profileOf("ada", Role.player), "ada")).toBe(true);
  });

  it("passes an admin who did not create the game", () => {
    expect(isGameHost(profileOf("lead", Role.admin), "ada")).toBe(true);
  });

  it("passes an owner who did not create the game", () => {
    expect(isGameHost(profileOf("boss", Role.owner), "ada")).toBe(true);
  });

  it("rejects an unrelated player", () => {
    expect(isGameHost(profileOf("randy", Role.player), "ada")).toBe(false);
  });
});
