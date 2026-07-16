/**
 * Pure access predicate for tournament reads. Decides whether a viewer may read
 * a tournament and in what relation: the host (who holds no member row and must
 * be admitted explicitly), any roster member, any admin/owner, or — while the
 * tournament is still joinable by code (lobby phase) — any signed-in user as a
 * prospective joiner. Everyone else is refused. No IO — callers load host +
 * roster + joinable and pass them in; the Prisma Role type is imported type-only
 * so this stays out of the client's runtime.
 */
import type { Role } from "@/generated/prisma/client";

export type ViewerRelation =
  | { allowed: true; as: "host" | "member" | "admin" | "guest" }
  | { allowed: false };

export interface ViewerInput {
  viewerId: string;
  viewerRole: Role;
  hostId: string;
  memberIds: readonly string[];
  // The tournament still admits players by code (lobby phase). Joining by code
  // persists no row, so the server cannot distinguish a legitimate code-joiner
  // from any other signed-in user while the lobby is open — so any signed-in
  // user is admitted as a guest until the tournament locks.
  joinable: boolean;
}

// Precedence is host -> member -> admin -> guest, and the order matters: a host
// who also joined a team must still read as host (DESIGN.md line 51), and an
// admin who is also a member reads as member (the more specific truth). `admin`
// is the fallback for staff with no tie; `guest` is the fallback only while the
// lobby is joinable. Role rank reuses `owner > admin > player`: anything above
// player is staff.
export function resolveViewer(input: ViewerInput): ViewerRelation {
  if (input.viewerId === input.hostId) return { allowed: true, as: "host" };
  if (input.memberIds.includes(input.viewerId))
    return { allowed: true, as: "member" };
  if (input.viewerRole !== "player") return { allowed: true, as: "admin" };
  if (input.joinable) return { allowed: true, as: "guest" };
  return { allowed: false };
}
