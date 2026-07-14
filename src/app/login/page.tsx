/**
 * Login page: redirects an already-authenticated visitor home, otherwise
 * renders the shared credential form against the login endpoint.
 */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CredentialForm } from "../credential-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <CredentialForm
      action="/api/auth/login"
      heading="Log in"
      submitLabel="Log in"
      passwordPlaceholder="Password"
      errorMessage="Invalid email or password."
      altHref="/signup"
      altLabel="Need an account? Sign up"
    />
  );
}
