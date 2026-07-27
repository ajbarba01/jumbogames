/**
 * Profile lifecycle and authorization guards. getOrCreateProfile verifies the
 * session's access token locally and reads the current auth user's profile,
 * writing only on first sight or genuine drift (owner when the email is
 * allowlisted). requireUser/requireOwner gate handlers and server components.
 */
import type { Profile } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail, parseOwnerEmails } from "@/lib/auth/owner-email";
import { localPartOf } from "@/lib/auth/display-name";
import { verifyAccessToken } from "./jwt";

export type AuthResult =
  { ok: true; profile: Profile } | { ok: false; status: 401 | 403 };

export async function getOrCreateProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  // getSession() reads the cookie locally; getUser() would revalidate over the
  // network. The token's signature is verified below, so the local read is safe.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const verified = await verifyAccessToken(session.access_token);
  if (!verified) return null;

  const existing = await prisma.profile.findUnique({
    where: { id: verified.sub },
  });

  const shouldOwn = isOwnerEmail(
    verified.email,
    parseOwnerEmails(process.env.OWNER_EMAILS),
  );

  // The common path is a plain read. Write only when the row is absent, or when
  // the stored email or owner grant has actually drifted from the token — so a
  // page load no longer costs a database write (DESIGN.md decision 24).
  if (existing) {
    const needsEmail = existing.email !== verified.email;
    const needsOwner = shouldOwn && existing.role !== Role.owner;
    if (!needsEmail && !needsOwner) return existing;
    return prisma.profile.update({
      where: { id: verified.sub },
      data: {
        ...(needsEmail ? { email: verified.email } : {}),
        ...(needsOwner ? { role: Role.owner } : {}),
      },
    });
  }

  const metaName = session.user.user_metadata?.display_name;
  const displayName =
    typeof metaName === "string" && metaName.trim() !== ""
      ? metaName.trim()
      : localPartOf(verified.email);

  return prisma.profile.create({
    data: {
      id: verified.sub,
      email: verified.email,
      displayName,
      role: shouldOwn ? Role.owner : Role.player,
    },
  });
}

export async function requireUser(): Promise<AuthResult> {
  const profile = await getOrCreateProfile();
  if (!profile) return { ok: false, status: 401 };
  return { ok: true, profile };
}

export async function requireOwner(): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (result.profile.role !== Role.owner) return { ok: false, status: 403 };
  return result;
}

// Passes for admin and owner (owner > admin > player). Gates the question bank
// and other admin-only pages; hosting is gated by isGameHost, not this.
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (result.profile.role === Role.player) return { ok: false, status: 403 };
  return result;
}

// Single source for the permissions listing query, shared by the owner page
// and its REST equivalent so the two surfaces never drift.
export function listProfiles() {
  return prisma.profile.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true },
  });
}

// Host powers over a single game: its creator, or any admin/owner acting as a
// rescue path when the creator drops off mid-event. Pure so routes can apply it
// to a tournament row they already fetched, without a second query. Takes only
// the id/role shape (not the full Profile) so resolveViewer — which only ever
// has a viewerId/viewerRole pair, not a loaded Profile — can share this one
// definition instead of re-deriving the rule.
export function isGameHost(
  profile: Pick<Profile, "id" | "role">,
  hostId: string,
): boolean {
  return profile.id === hostId || profile.role !== Role.player;
}
