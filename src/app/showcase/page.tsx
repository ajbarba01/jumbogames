/**
 * Dev-only showcase route: renders every kit member in every state — the
 * living spec (UI.md) and the surface where theme work is critiqued.
 */
import { notFound } from "next/navigation";
import { ShowcaseGallery } from "./showcase-gallery";

export default function ShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ShowcaseGallery />;
}
