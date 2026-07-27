/**
 * The per-match Durable Object. At this stage it terminates the WebSocket
 * upgrade and refuses the connection with a typed error frame; state, ticket
 * verification, broadcast and alarms land in the tasks that follow.
 */
import type { ServerFrame } from "@jumbo/protocol";
import type { Env } from "./env";

export class MatchRoom implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(_request: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const frame: ServerFrame = { type: "error", reason: "hydrate-failed" };
    server.send(JSON.stringify(frame));
    server.close(1011, "not implemented");
    return new Response(null, { status: 101, webSocket: client });
  }
}
