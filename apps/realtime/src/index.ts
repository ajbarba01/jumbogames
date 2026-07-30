/**
 * Worker entrypoint. Routes a WebSocket upgrade for /room/:matchId to that
 * match's Durable Object, addressed by name so every client for one match lands
 * on the same authoritative instance. Nothing else is served.
 */
import type { Env } from "./env";
import { installBundledWordList } from "@jumbo/engine/minigames/wordlock/install-words";

// Installed at module scope so every cold start of this Worker has the Word
// Lock dictionary ready before any Durable Object's `apply` can reach it.
installBundledWordList();

export { MatchRoom } from "./MatchRoom";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = /^\/room\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
    if (!match) return new Response("Not found", { status: 404 });

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const id = env.MATCH_ROOM.idFromName(match[1]);
    return env.MATCH_ROOM.get(id).fetch(request);
  },
};
