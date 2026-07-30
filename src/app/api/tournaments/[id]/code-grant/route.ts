/**
 * Route handler: exchanges the `?c=` a link-borne viewer arrived with for an
 * httpOnly, per-game cookie, so the write grant survives the client scrubbing
 * the code out of the address bar (DESIGN decision 16: link = read, code =
 * write). The cookie stores the presented code itself rather than a bare
 * "granted" flag, because the page re-checks it against the game's real code on
 * every render — so a hand-forged cookie grants nothing its author did not
 * already know, and no signing secret is needed to make that safe.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/http";
import { joinTournamentSchema } from "@/lib/schemas/tournament";
import { codeCookieName } from "@/lib/tournament/code-grant";

/** Long enough to outlast a hacknight; the grant is per tab-session anyway. */
const GRANT_MAX_AGE_SECONDS = 12 * 60 * 60;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const { id } = await ctx.params;
  const parsed = joinTournamentSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { code: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "No such game" }, { status: 404 });
  }
  // Refuse rather than store a wrong code: a cookie that never validates would
  // look like a grant to every later debugging eye and be one to none of them.
  if (tournament.code !== parsed.data.code) {
    return NextResponse.json({ error: "Wrong code" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(codeCookieName(id), tournament.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GRANT_MAX_AGE_SECONDS,
  });
  return response;
}
