/**
 * Route handler: validate credentials, create the Supabase auth user, and
 * (email confirmation off) sign them in. The profile is upserted lazily on the
 * first authenticated request.
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
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return NextResponse.json({ error: "Could not sign up" }, { status: 400 });
  }

  await getOrCreateProfile();
  return NextResponse.json({ ok: true });
}
