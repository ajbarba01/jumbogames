/**
 * Pure helpers for the OWNER_EMAILS allowlist: parse the comma-separated env
 * value into a normalized set and test membership. No IO; unit-tested.
 */
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function parseOwnerEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map(normalize)
      .filter((email) => email.length > 0),
  );
}

export function isOwnerEmail(email: string, allowlist: Set<string>): boolean {
  return allowlist.has(normalize(email));
}
