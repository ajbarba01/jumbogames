/**
 * Signup page: redirects an already-authenticated visitor home, otherwise
 * renders the shared credential form against the signup endpoint.
 */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CredentialForm } from "../credential-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <CredentialForm
      action="/api/auth/signup"
      heading="Sign up"
      submitLabel="Sign up"
      passwordPlaceholder="Password (8+ characters)"
      minPasswordLength={8}
      errorMessage="Could not sign up. Use a valid email and 8+ char password."
      altHref="/login"
      altLabel="Have an account? Log in"
    />
  );
}
