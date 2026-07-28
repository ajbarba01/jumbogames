/**
 * The Worker's bindings and configuration. ORIGIN_URL points at the Next app
 * for hydrate/persist.
 *
 * The two secrets are deliberately separate. REALTIME_TICKET_KEY is an HMAC
 * signing key: it never leaves this Worker or the Next app. REALTIME_INTERNAL_
 * SECRET is a bearer credential presented on every call back to Next, so it
 * rides in a header past proxies and into tail logs — far more exposed. One
 * value serving both would mean that leaking the exposed one also grants the
 * ability to forge a ticket naming any player on any match.
 */
export interface Env {
  MATCH_ROOM: DurableObjectNamespace;
  ORIGIN_URL: string;
  REALTIME_TICKET_KEY: string;
  REALTIME_INTERNAL_SECRET: string;
}
