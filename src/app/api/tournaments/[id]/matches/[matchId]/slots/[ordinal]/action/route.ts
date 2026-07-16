/**
 * Route handler: a gameplay action on the active slot. Validates the body
 * against the slot's kind schema and requires membership; the reducer enforces
 * the snapshot roster and the deadline, so late or non-participant actions no-op.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/profile";
import { parseJsonBody } from "@/lib/http";
import { loadMatchRows } from "@/lib/match/server/load";
import { mutateMatch } from "@/lib/match/server/mutate";
import { actionSchemaFor } from "@/lib/minigames/actions";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ matchId: string; ordinal: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }
  const { matchId, ordinal: ordinalParam } = await ctx.params;
  const ordinal = Number(ordinalParam);
  if (!Number.isInteger(ordinal)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const loaded = await loadMatchRows(matchId);
  if (!loaded || loaded.rows.teamB === null) {
    return NextResponse.json({ error: "No such match" }, { status: 404 });
  }
  if (!loaded.memberIds.has(auth.profile.id)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }
  const slot = loaded.rows.slots.find((s) => s.ordinal === ordinal);
  if (!slot) {
    return NextResponse.json({ error: "No such slot" }, { status: 404 });
  }

  const parsed = actionSchemaFor(slot.kind).safeParse(
    await parseJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await mutateMatch(matchId, {
    type: "gameAction",
    ordinal,
    playerId: auth.profile.id,
    action: parsed.data,
  });
  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
