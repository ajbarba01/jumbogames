/**
 * Route handlers on a single trivia question. PATCH applies a partial
 * update; DELETE removes the question. Admin/owner only.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/profile";
import { triviaQuestionUpdateSchema } from "@/lib/schemas/trivia";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const parsed = triviaQuestionUpdateSchema.safeParse(
    await parseJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.triviaQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No such question" }, { status: 404 });
  }

  const question = await prisma.triviaQuestion.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ question });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const existing = await prisma.triviaQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No such question" }, { status: 404 });
  }

  await prisma.triviaQuestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
