/**
 * Client manager for the /admin/questions surface: a debounced-search,
 * paginated list of trivia questions with create/edit and delete modals.
 * Every mutation re-fetches the current page from the API so the list stays
 * the source of truth; loading, empty, and error states all render.
 */
"use client";

import { useEffect, useState } from "react";
import { Button, ModalShell, Select, Spinner, TextField } from "@jumbo/ui";
import { QUESTIONS_PAGE_SIZE } from "@/lib/schemas/trivia";

const SEARCH_DEBOUNCE_MS = 300;
const DIFFICULTY_OPTIONS = ["any", "easy", "medium", "hard"] as const;

type Difficulty = "easy" | "medium" | "hard";
type DifficultyOption = (typeof DIFFICULTY_OPTIONS)[number];

interface Question {
  id: string;
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  category: string | null;
  difficulty: string | null;
}

interface QuestionPayload {
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: [string, string, string];
  category?: string;
  difficulty?: Difficulty;
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; question: Question }
  | { mode: "delete"; question: Question };

async function readError(res: Response, fallback: string): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-caps font-bold uppercase tracking-widest text-s4">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-meta font-bold text-crit">{error}</span>
      ) : null}
    </label>
  );
}

function QuestionModal({
  state,
  onClose,
  onSaved,
}: {
  state: { mode: "create" } | { mode: "edit"; question: Question };
  onClose: () => void;
  onSaved: () => void;
}): React.JSX.Element {
  const source = state.mode === "edit" ? state.question : null;
  const [prompt, setPrompt] = useState(source?.prompt ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(
    source?.correctAnswer ?? "",
  );
  const [wrong, setWrong] = useState<[string, string, string]>([
    source?.incorrectAnswers[0] ?? "",
    source?.incorrectAnswers[1] ?? "",
    source?.incorrectAnswers[2] ?? "",
  ]);
  const [category, setCategory] = useState(source?.category ?? "");
  const [difficulty, setDifficulty] = useState<DifficultyOption>(
    (source?.difficulty as DifficultyOption | null) ?? "any",
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = {
    prompt: prompt.trim() === "",
    correctAnswer: correctAnswer.trim() === "",
    wrong: wrong.map((w) => w.trim() === "") as [boolean, boolean, boolean],
  };
  const invalid =
    missing.prompt || missing.correctAnswer || missing.wrong.some(Boolean);

  async function submit(): Promise<void> {
    if (invalid) {
      setTouched(true);
      return;
    }
    setBusy(true);
    setError(null);
    const payload: QuestionPayload = {
      prompt: prompt.trim(),
      correctAnswer: correctAnswer.trim(),
      incorrectAnswers: wrong.map((w) => w.trim()) as [string, string, string],
      category: category.trim() || undefined,
      difficulty: difficulty === "any" ? undefined : difficulty,
    };
    const res = await fetch(
      state.mode === "edit"
        ? `/api/admin/questions/${state.question.id}`
        : "/api/admin/questions",
      {
        method: state.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (res.ok) {
      onSaved();
      return;
    }
    setError(await readError(res, "Could not save question."));
  }

  const title = state.mode === "edit" ? "Edit question" : "New question";

  return (
    <ModalShell
      open
      onClose={onClose}
      aria-label={title}
      className="flex max-h-[calc(100dvh-2rem)] w-112 max-w-[calc(100vw-2rem)] flex-col overflow-y-auto"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl uppercase">{title}</h2>
        <Field
          label="Prompt"
          error={touched && missing.prompt ? "Required" : undefined}
        >
          <TextField
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            invalid={touched && missing.prompt}
            disabled={busy}
          />
        </Field>
        <Field
          label="Correct answer"
          error={touched && missing.correctAnswer ? "Required" : undefined}
        >
          <TextField
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            invalid={touched && missing.correctAnswer}
            disabled={busy}
          />
        </Field>
        <Field
          label="Wrong answers"
          error={
            touched && missing.wrong.some(Boolean)
              ? "All three needed"
              : undefined
          }
        >
          <div className="flex flex-col gap-2">
            {wrong.map((value, i) => (
              <TextField
                key={i}
                value={value}
                onChange={(e) =>
                  setWrong((prev) => {
                    const next = [...prev] as [string, string, string];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                invalid={touched && missing.wrong[i]}
                disabled={busy}
                aria-label={`Wrong answer ${i + 1}`}
              />
            ))}
          </div>
        </Field>
        <div className="flex gap-3">
          <Field label="Category">
            <TextField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="Difficulty">
            <Select
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={(v) => setDifficulty(v as DifficultyOption)}
              aria-label="Difficulty"
            />
          </Field>
        </div>
        {error ? <p className="text-sec font-bold text-crit">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? <Spinner label="Saving" /> : null}
            Save question
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteModal({
  question,
  onClose,
  onDeleted,
}: {
  question: Question;
  onClose: () => void;
  onDeleted: () => void;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/questions/${question.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      onDeleted();
      return;
    }
    setError(await readError(res, "Could not delete question."));
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      aria-label="Delete question?"
      className="w-96"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl uppercase">Delete question?</h2>
        <p className="truncate text-sec text-s4">{question.prompt}</p>
        {error ? <p className="text-sec font-bold text-crit">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? <Spinner label="Deleting" /> : null}
            Delete question
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function QuestionManager(): React.JSX.Element {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(QUESTIONS_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQuery) params.set("q", debouncedQuery);

      try {
        const res = await fetch(`/api/admin/questions?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(
            await readError(res, "Couldn't load the question bank."),
          );
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          questions: Question[];
          total: number;
          pageSize: number;
        };
        if (cancelled) return;
        const newPageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > newPageCount) {
          setLoading(false);
          setPage(newPageCount);
          return;
        }
        setQuestions(data.questions);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setLoaded(true);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoadError("Couldn't load the question bank.");
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const refetch = (): void => setRefreshKey((k) => k + 1);

  function closeAfterMutation(): void {
    setModal(null);
    refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search questions"
          placeholder="Search questions"
          className="min-w-0 flex-1"
        />
        <Button variant="primary" onClick={() => setModal({ mode: "create" })}>
          New question
        </Button>
      </div>

      <div className="overflow-hidden border-2 border-s6 bg-s2">
        <div className="flex items-center justify-between border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
          <span>Question</span>
          <span>{loaded ? `${total} total` : ""}</span>
        </div>

        {loadError ? (
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <p className="text-sec font-bold text-crit">{loadError}</p>
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : !loaded && loading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <Spinner label="Loading questions" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-sec font-bold text-s11">No questions match.</p>
          </div>
        ) : (
          <ul className="divide-y-2 divide-s6">
            {questions.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sec text-s11">{q.prompt}</p>
                  {q.category || q.difficulty ? (
                    <p className="truncate text-meta text-s7">
                      {[q.category, q.difficulty].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setModal({ mode: "edit", question: q })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setModal({ mode: "delete", question: q })}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {loaded && !loadError ? (
          <div className="flex items-center justify-between border-t-2 border-s6 px-4 py-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-caps uppercase tracking-widest text-s7">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              disabled={page === pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      {modal?.mode === "create" || modal?.mode === "edit" ? (
        <QuestionModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={closeAfterMutation}
        />
      ) : null}

      {modal?.mode === "delete" ? (
        <DeleteModal
          question={modal.question}
          onClose={() => setModal(null)}
          onDeleted={closeAfterMutation}
        />
      ) : null}
    </div>
  );
}
