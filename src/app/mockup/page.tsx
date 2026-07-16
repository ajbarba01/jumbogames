/**
 * Dev-only mockup route: the real match container driven by the fake match
 * client — the surface where match flow and choreography are iterated
 * before backend wiring, and a permanent dev harness afterward.
 */
import { notFound } from "next/navigation";
import { MockupHarness } from "./mockup-harness";

export default function MockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <MockupHarness />;
}
