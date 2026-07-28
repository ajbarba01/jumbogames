/**
 * Per-viewer view projection and fan-out. Each socket receives the full state
 * redacted for its own viewer — a game with hidden information strips it in
 * `redact`, so a spectator or opponent never receives what they must not see.
 * Frames carry the room's sequence number so a client can drop stale pushes and
 * retire optimistic predictions.
 */
import { MINIGAMES } from "@jumbo/engine";
import type { MatchView, MatchState } from "@jumbo/engine";
import type { ServerStateFrame } from "@jumbo/protocol";
import type { RoomState } from "./state";
import type { Attachment } from "./MatchRoom";

function redactState(state: MatchState, viewerId: string | null): MatchState {
  return {
    ...state,
    slots: state.slots.map((slot) => {
      const game = MINIGAMES[slot.kind];
      if (typeof game.redact !== "function") return slot;
      if (slot.payload === null || slot.payload === undefined) return slot;
      return { ...slot, payload: game.redact(slot.payload, viewerId) };
    }),
  };
}

export function viewFor(room: RoomState, viewer: Attachment): MatchView {
  const viewerId = viewer.isPlayer ? viewer.profileId : null;
  return {
    match: redactState(room.state, viewerId),
    viewerId,
    role: viewer.isPlayer ? "player" : "spectator",
    playerLabels: room.labels,
  };
}

export function broadcast(
  ctx: DurableObjectState,
  room: RoomState,
  now: number,
): void {
  for (const socket of ctx.getWebSockets()) {
    const viewer = socket.deserializeAttachment() as Attachment | null;
    if (!viewer) continue;
    const frame: ServerStateFrame = {
      type: "state",
      seq: room.seq,
      serverNow: now,
      view: viewFor(room, viewer),
    };
    socket.send(JSON.stringify(frame));
  }
}
