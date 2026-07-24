/**
 * Display-name derivation. `localPartOf` yields the pre-`@` segment of an email,
 * the single source used both by the backfill migration and by create-time
 * derivation in getOrCreateProfile when no explicit name was supplied.
 */
export function localPartOf(email: string): string {
  return email.trim().split("@")[0];
}
