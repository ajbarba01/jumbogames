/**
 * Dev-only mockup route: the create-game form on fake data — the one
 * board-sticker card with name, minigame pool picker, K and max-teams
 * steppers, validation, and the slam-wipe handoff into the created game.
 */
import { notFound } from "next/navigation";
import { CreateGameMockup } from "./create-game-mockup";

export default function CreateGameMockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <CreateGameMockup />;
}
