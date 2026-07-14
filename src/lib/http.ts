/**
 * Shared request-parsing helpers for route handlers. parseJsonBody swallows
 * malformed/empty JSON bodies so callers can fail with 400 via Zod instead of
 * a 500 from an unguarded request.json() throw.
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
