/**
 * Dev-only mockup route: the post-start player surface — Board/My team tabs
 * (Board/Join a team when un-teamed), the team room with roster fluidity and
 * lock states, and the persistent code-carrying team picker — on fake data.
 */
import { notFound } from "next/navigation";
import { TeamTabsMockup } from "./team-tabs-mockup";

export default function TeamMockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <TeamTabsMockup />;
}
