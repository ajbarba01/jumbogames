/**
 * Pure access predicate for tournament reads. Resolves a viewer's relation to
 * a tournament: the host (who holds no member row and must be admitted
 * explicitly), any roster member, any admin/owner, or — the fallback for any
 * other signed-in user — a guest. Reads are open to anyone signed in
 * (DESIGN.md decision 16, spectate by link); only writes check the roster.
 * Also reports `canHost`, orthogonal to `as`: whether the viewer may exercise
 * host controls on this game (the creator, or any admin/owner as a rescue
 * path), via the same `isGameHost` predicate the write-side routes enforce,
 * so the read and write surfaces cannot drift apart. No IO — callers load
 * host + roster and pass them in; the Prisma Role type is imported type-only
 * so this stays out of the client's runtime.
 */
import type { Role } from "@/generated/prisma/client";
import { isGameHost } from "@/lib/auth/profile";

export interface ViewerRelation {
  as: "host" | "member" | "admin" | "guest";
  canHost: boolean;
}

export interface ViewerInput {
  viewerId: string;
  viewerRole: Role;
  hostId: string;
  memberIds: readonly string[];
}

// Precedence is host -> member -> admin -> guest, and the order matters: a host
// who also joined a team must still read as host (DESIGN.md line 51), and an
// admin who is also a member reads as member (the more specific truth). `admin`
// is the fallback for staff with no tie; `guest` is the fallback for any other
// signed-in user (decision 16, spectate by link). Role rank reuses
// `owner > admin > player`: anything above player is staff.
export function resolveViewer(input: ViewerInput): ViewerRelation {
  const canHost = isGameHost(
    { id: input.viewerId, role: input.viewerRole },
    input.hostId,
  );
  if (input.viewerId === input.hostId) return { as: "host", canHost };
  if (input.memberIds.includes(input.viewerId))
    return { as: "member", canHost };
  if (input.viewerRole !== "player") return { as: "admin", canHost };
  return { as: "guest", canHost };
}

// The code is a write credential, not a read credential (DESIGN.md decision
// 16: "link = read, code = write") — opening reads to any signed-in user must
// not also hand the code to a stranger. A viewer already holds it if they can
// host or are a roster member (they got it to join or created the game); a
// guest holds it only by presenting it back, normalized the way
// joinTournamentSchema does (trim + uppercase) so a differently-cased but
// correct code still matches.
export function holdsGameCode(
  relation: ViewerRelation,
  gameCode: string,
  presentedCode: string | null,
): boolean {
  if (relation.canHost || relation.as === "member") return true;
  if (presentedCode === null) return false;
  return presentedCode.trim().toUpperCase() === gameCode;
}
