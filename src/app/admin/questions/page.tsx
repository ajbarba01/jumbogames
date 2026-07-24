/**
 * Admin question-bank page: gates on admin/owner (requireAdmin), then renders
 * the client manager that lists, searches, creates, edits, and deletes the
 * trivia questions games deal from.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/profile";
import { QuestionManager } from "./question-manager";

export default async function QuestionsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="slip text-meta font-bold uppercase tracking-widest text-s7 hover:text-s10"
        >
          ← Back to home
        </Link>
        <h1 className="font-display text-2xl uppercase text-s12">
          Question bank
        </h1>
        <p className="text-sec text-s9">
          Author the trivia questions games deal from.
        </p>
      </div>

      <QuestionManager />
    </main>
  );
}
