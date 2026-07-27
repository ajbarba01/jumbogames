/**
 * The durable half of the write grant (DESIGN decision 16: link = read, code =
 * write). A joiner arrives with `?c=`, and the client scrubs it out of the
 * address bar the moment the server has honored it — so the grant needs to
 * live somewhere that survives a remount and a reload without going back into
 * the URL. That place is an httpOnly, per-game cookie holding the code the
 * viewer already presented. It is re-checked against the game's real code on
 * every read, exactly as the query parameter is, so a forged cookie grants
 * nothing its author did not already know. Pure: the route handler writes the
 * cookie, the page reads it.
 */

// Per game, so a grant on one never reads as a grant on another.
const COOKIE_PREFIX = "jg_code_";

export function codeCookieName(tournamentId: string): string {
  return `${COOKIE_PREFIX}${tournamentId}`;
}

/**
 * Which code the server should check for this request. The URL wins while it
 * still carries one — a viewer following a fresh link to a game they already
 * hold a stale cookie for must be judged on the link they actually clicked.
 */
export function presentedCode(
  query: string | null,
  cookie: string | null,
): string | null {
  if (query !== null && query.trim() !== "") return query;
  if (cookie !== null && cookie.trim() !== "") return cookie;
  return null;
}
