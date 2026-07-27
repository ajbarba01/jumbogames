/**
 * Guard for the server-to-server routes the realtime Worker calls. These carry
 * no user session: the caller proves itself with a shared secret, and a request
 * that cannot is refused before any database work. A browser can never satisfy
 * this, which is the point — these routes bypass per-user authorization.
 */

export function isInternalCaller(request: Request): boolean {
  const expected = process.env.REALTIME_INTERNAL_SECRET;
  if (!expected) return false;
  const presented = request.headers.get("x-internal-auth");
  if (presented === null) return false;
  // Constant-time comparison: a length-leaking early return on a secret is a
  // timing oracle, however impractical over a network.
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
