/**
 * Route handler: set a user's role to player or admin. Owner-only. Owner rows
 * are immutable (owner is env-driven) and the owner cannot change their own row.
 */
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/profile";
import { roleChangeSchema } from "@/lib/schemas/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { parseJsonBody } from "@/lib/http";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id } = await ctx.params;
  if (id === auth.profile.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const parsed = roleChangeSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "No such user" }, { status: 404 });
  }
  if (target.role === Role.owner) {
    return NextResponse.json(
      { error: "Owner role is not editable" },
      { status: 400 },
    );
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ user: updated });
}
