/**
 * Dev-only mockup route: the admin question-bank CRUD surface driven by fake
 * data — list, search, pagination, editor modal, and delete flows in every
 * state, iterated here before the real /admin/questions page is wired.
 */
import { notFound } from "next/navigation";
import { AdminQuestionsMockup } from "./admin-questions-mockup";

export default function AdminQuestionsMockupPage(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();
  return <AdminQuestionsMockup />;
}
