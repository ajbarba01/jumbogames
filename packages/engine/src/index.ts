/**
 * The pure match engine: state types, the match reducer and its derivations,
 * scoring normalization, the round draw, and the minigame registry. No IO, no
 * Prisma, no React — imported identically by the Next app and the realtime
 * Worker so both drive a match through the same code.
 */
export * from "./match/types";
export * from "./match/derive";
export * from "./match/lifecycle";
export * from "./match/normalize";
export * from "./match/timers";
export * from "./match/round-draw";
export * from "./match/presentation";
export * from "./match/view";
export * from "./minigames/types";
export * from "./minigames/registry";
export * from "./minigames/actions";
export * from "./minigames/eligible";
// Per-game public surfaces. The registry reaches these internally, but the
// match UI and the realtime Worker also need their state shapes and pure
// helpers, so they are part of the package's contract rather than internals.
export * from "./minigames/stub/server";
export * from "./minigames/trivia/server";
export * from "./minigames/trivia/deal";
export * from "./minigames/trivia/rope";
export * from "./minigames/trivia/ticker";
export * from "./minigames/trivia/view";
export { seededShuffle } from "./random";
