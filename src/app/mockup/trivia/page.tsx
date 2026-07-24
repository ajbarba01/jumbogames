/**
 * Dev-only mockup route: the trivia tug-of-war play surface — rope, free-pace
 * question stream, per-answer feedback, and the spectator arena — driven by a
 * local fake match sim ahead of the real M5 wiring.
 */
import { notFound } from "next/navigation";
import { TriviaMockup } from "./trivia-mockup";

export default function TriviaMockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <TriviaMockup />;
}
