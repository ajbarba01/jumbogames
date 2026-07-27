/**
 * The Worker's bindings and configuration. ORIGIN_URL points at the Next app
 * for hydrate/persist; REALTIME_SHARED_SECRET is injected as a secret and is
 * used both to verify connect tickets and to authenticate calls back to Next.
 */
export interface Env {
  MATCH_ROOM: DurableObjectNamespace;
  ORIGIN_URL: string;
  REALTIME_SHARED_SECRET: string;
}
