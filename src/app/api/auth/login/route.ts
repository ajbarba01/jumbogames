/**
 * Route handler: validate credentials and sign the user in via Supabase.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/schemas/auth";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { parseJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await getOrCreateProfile();
  return NextResponse.json({ ok: true });
}
