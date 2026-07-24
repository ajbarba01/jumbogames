/**
 * Dev-only mockup route: the reworked home — join-code hero, secondary
 * create-a-game action, and role-aware identity chrome — on fake data.
 */
import { notFound } from "next/navigation";
import { HomeMockup } from "./home-mockup";

export default function HomeMockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <HomeMockup />;
}
