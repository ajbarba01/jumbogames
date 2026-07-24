/**
 * Route handler: the trivia question bank. GET lists questions with a
 * prompt search and pagination; POST creates a question. Admin/owner only.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/profile";
import {
  triviaQuestionSchema,
  questionListQuerySchema,
  QUESTIONS_PAGE_SIZE,
} from "@/lib/schemas/trivia";
import { parseJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = questionListQuerySchema.safeParse(
    Object.fromEntries(searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { q, page } = parsed.data;
  const where = q
    ? { prompt: { contains: q, mode: "insensitive" as const } }
    : {};

  const [questions, total] = await Promise.all([
    prisma.triviaQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * QUESTIONS_PAGE_SIZE,
      take: QUESTIONS_PAGE_SIZE,
    }),
    prisma.triviaQuestion.count({ where }),
  ]);

  return NextResponse.json({
    questions,
    total,
    page,
    pageSize: QUESTIONS_PAGE_SIZE,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const parsed = triviaQuestionSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const question = await prisma.triviaQuestion.create({ data: parsed.data });
  return NextResponse.json({ question }, { status: 201 });
}
