/**
 * The match WebSocket wire contract. Client messages are validated at the
 * Durable Object boundary with `clientMessageSchema` before any reducer sees
 * them; server frames carry the full redacted view plus a monotonic sequence
 * number, so a client can drop stale frames and retire optimistic predictions.
 */
import { z } from "zod";
import type { MatchView } from "@jumbo/engine";

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("action"),
    ordinal: z.number().int().nonnegative(),
    seq: z.number().int().nonnegative(),
    // The per-kind shape is validated separately by actionSchemaFor once the
    // slot's kind is known; here it is only required to be an object.
    action: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("ready"),
    ordinal: z.number().int().nonnegative(),
    seq: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("forceStart"),
    ordinal: z.number().int().nonnegative(),
    seq: z.number().int().nonnegative(),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** A full state push. Never a change ping — the payload is the state. */
export interface ServerStateFrame {
  type: "state";
  seq: number;
  serverNow: number;
  view: MatchView;
}

/** A terminal error. The client falls back to the HTTP snapshot, read-only. */
export interface ServerErrorFrame {
  type: "error";
  reason: "unauthorized" | "not-found" | "hydrate-failed" | "invalid";
}

export type ServerFrame = ServerStateFrame | ServerErrorFrame;
