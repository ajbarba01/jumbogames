/**
 * Route handler: update the signed-in user's own profile. Currently the
 * editable field is the display name; validated server-side and scoped to the
 * caller (no id in the path — a user can only change their own profile).
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { displayNameSchema } from "@/lib/schemas/auth";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({ displayName: displayNameSchema });

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const parsed = bodySchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid display name" },
      { status: 400 },
    );
  }

  const updated = await prisma.profile.update({
    where: { id: auth.profile.id },
    data: { displayName: parsed.data.displayName },
    select: { displayName: true },
  });

  return NextResponse.json(updated);
}
