/**
 * Route handler: list all profiles for the owner permissions page. Owner-only,
 * enforced server-side.
 */
import { NextResponse } from "next/server";
import { requireOwner, listProfiles } from "@/lib/auth/profile";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const users = await listProfiles();
  return NextResponse.json({ users });
}
