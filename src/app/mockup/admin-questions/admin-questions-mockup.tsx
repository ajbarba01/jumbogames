/**
 * Admin question-bank mockup: the /admin/questions surface on fake data —
 * searchable, difficulty-filtered paginated list, ModalShell editor (prompt,
 * correct, 3 wrong, optional category/difficulty), delete confirm — with a
 * debug panel to force the loading, empty, and error states and to fail saves.
 */
"use client";

import { useMemo, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  Button,
  Card,
  ConfirmDialog,
  MenuItem,
  ModalShell,
  PopoverCard,
  Select,
  Spinner,
  TextField,
  Toggle,
  cx,
} from "@jumbo/ui";

const FAKE_SAVE_MS = 700;
const PAGE_SIZE = 9;
const SEEDED_TOTAL = 87;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];

interface MockQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: [string, string, string];
  category?: string;
  difficulty?: string;
}

const FAKE_QUESTIONS: MockQuestion[] = [
  {
    id: "q1",
    prompt: "Which planet has the hottest surface temperature?",
    correctAnswer: "Venus",
    incorrectAnswers: ["Mercury", "Mars", "Jupiter"],
    category: "Science: Planets",
    difficulty: "easy",
  },
  {
    id: "q2",
    prompt: "Who wrote the novel Dune?",
    correctAnswer: "Frank Herbert",
    incorrectAnswers: ["Isaac Asimov", "Arthur C. Clarke", "Ray Bradbury"],
    category: "Books",
    difficulty: "medium",
  },
  {
    id: "q3",
    prompt:
      "In the 1997 video game GoldenEye 007, which facility features an " +
      "infamous vent-crawl sequence in its opening mission on the Dam level?",
    correctAnswer: "Arkhangelsk chemical weapons facility",
    incorrectAnswers: [
      "Severnaya bunker",
      "Frigate La Fayette",
      "Aztec complex",
    ],
    category: "Video games",
    difficulty: "hard",
  },
  {
    id: "q4",
    prompt: "What is the capital of New Zealand?",
    correctAnswer: "Wellington",
    incorrectAnswers: ["Auckland", "Christchurch", "Hamilton"],
    category: "Geography",
    difficulty: "medium",
  },
  {
    id: "q5",
    prompt: "Which element has the chemical symbol Au?",
    correctAnswer: "Gold",
    incorrectAnswers: ["Silver", "Argon", "Aluminium"],
    category: "Science: Chemistry",
    difficulty: "easy",
  },
  {
    id: "q6",
    prompt: "Which band released the album OK Computer?",
    correctAnswer: "Radiohead",
    incorrectAnswers: ["Blur", "Oasis", "Pulp"],
    category: "Music",
  },
  {
    id: "q7",
    prompt: "In what year did the Berlin Wall fall?",
    correctAnswer: "1989",
    incorrectAnswers: ["1987", "1991", "1993"],
    category: "History",
    difficulty: "medium",
  },
  {
    id: "q8",
    prompt: "How many hearts does an octopus have?",
    correctAnswer: "Three",
    incorrectAnswers: ["One", "Two", "Four"],
  },
  {
    id: "q9",
    prompt: "Which film won the first Academy Award for Best Picture?",
    correctAnswer: "Wings",
    incorrectAnswers: ["Sunrise", "Metropolis", "The Jazz Singer"],
    category: "Film",
    difficulty: "hard",
  },
];

type BankView = "loaded" | "loading" | "empty" | "error";
const BANK_VIEWS = ["loaded", "loading", "empty", "error"] as const;

const DIFFICULTY_FILTERS = [
  "any difficulty",
  "easy",
  "medium",
  "hard",
] as const;
type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number];

const DIFFICULTY_LABELS: Record<DifficultyFilter, string> = {
  "any difficulty": "Any difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Difficulty filter as a proper dropdown, built page-locally on the kit's
 *  PopoverCard + MenuItem (a KIT-GAPS member): the kit Select is a compact
 *  accent chip that resizes to its value and exposes no width/height/disabled
 *  control, so it can't hold a constant footprint against an inline field. The
 *  trigger here is a fixed-width sticker that stretches to the field's height
 *  (the row is items-stretch); the popup carries the paper menu skin. */
function DifficultyFilter({
  value,
  onChange,
  disabled,
}: {
  value: DifficultyFilter;
  onChange: (next: DifficultyFilter) => void;
  disabled: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <PopoverCard
      open={open && !disabled}
      onOpenChange={setOpen}
      side="bottom"
      align="start"
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-label="Filter by difficulty"
          className={cx(
            "slip sticker flex w-44 shrink-0 items-center justify-between gap-2 rounded-r2 bg-s2 px-4 text-sec font-bold text-s11",
            disabled
              ? "cursor-default opacity-60"
              : "sticker-hover sticker-press cursor-pointer",
            open && !disabled && "sticker-pressed",
          )}
        >
          <span className="truncate">{DIFFICULTY_LABELS[value]}</span>
          <span aria-hidden className="text-s8">
            ▾
          </span>
        </button>
      }
    >
      <div className="w-44">
        {DIFFICULTY_FILTERS.map((option) => (
          <MenuItem
            key={option}
            selected={option === value}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
          >
            {DIFFICULTY_LABELS[option]}
          </MenuItem>
        ))}
      </div>
    </PopoverCard>
  );
}

type EditorTarget = { mode: "new" } | { mode: "edit"; question: MockQuestion };

function MetaLine({ q }: { q: MockQuestion }): React.JSX.Element | null {
  if (!q.category && !q.difficulty) return null;
  return (
    <p className="truncate text-meta text-s7">
      {[q.category, q.difficulty].filter(Boolean).join(" · ")}
    </p>
  );
}

function SkeletonRows(): React.JSX.Element {
  return (
    <ul
      aria-hidden
      className="animate-pulse divide-y-2 divide-s6 motion-reduce:animate-none"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3.5">
          <div className="h-3.5 w-2/3 rounded-r1 bg-s4" />
          <div className="h-2.5 w-24 rounded-r1 bg-s3" />
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  optional = false,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-caps font-bold uppercase tracking-widest text-s4">
        {label}
        {optional && <span className="text-s6"> · optional</span>}
      </span>
      {children}
      {error && <span className="text-meta font-bold text-crit">{error}</span>}
    </label>
  );
}

function EditorModal({
  target,
  failSaves,
  onSave,
  onClose,
}: {
  target: EditorTarget;
  failSaves: boolean;
  onSave: (q: MockQuestion) => void;
  onClose: () => void;
}): React.JSX.Element {
  const source = target.mode === "edit" ? target.question : null;
  const [prompt, setPrompt] = useState(source?.prompt ?? "");
  const [correct, setCorrect] = useState(source?.correctAnswer ?? "");
  const [wrong, setWrong] = useState<[string, string, string]>(
    source?.incorrectAnswers ?? ["", "", ""],
  );
  const [category, setCategory] = useState(source?.category ?? "");
  const [difficulty, setDifficulty] = useState(source?.difficulty ?? "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [shakes, setShakes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const missing = {
    prompt: prompt.trim() === "",
    correct: correct.trim() === "",
    wrong: wrong.map((w) => w.trim() === "") as [boolean, boolean, boolean],
  };
  const invalid =
    missing.prompt || missing.correct || missing.wrong.some(Boolean);

  const submit = () => {
    if (invalid) {
      setTouched(true);
      setShakes((n) => n + 1);
      return;
    }
    setBusy(true);
    setSaveFailed(false);
    timer.current = setTimeout(() => {
      if (failSaves) {
        setBusy(false);
        setSaveFailed(true);
        setShakes((n) => n + 1);
        return;
      }
      onSave({
        id: source?.id ?? `q-new-${Date.now()}`,
        prompt: prompt.trim(),
        correctAnswer: correct.trim(),
        incorrectAnswers: wrong.map((w) => w.trim()) as [
          string,
          string,
          string,
        ],
        category: category.trim() || undefined,
        difficulty: difficulty.trim() || undefined,
      });
    }, FAKE_SAVE_MS);
  };

  const title = target.mode === "new" ? "New question" : "Edit question";
  return (
    <ModalShell
      open
      onClose={() => {
        clearTimeout(timer.current);
        onClose();
      }}
      aria-label={title}
      className="flex max-h-[calc(100dvh-2rem)] w-112 max-w-[calc(100vw-2rem)] flex-col overflow-y-auto"
    >
      <motion.div
        key={shakes}
        animate={shakes > 0 ? { x: SHAKE_KEYFRAMES } : undefined}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 p-6"
      >
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
            placeholder="Which planet has the hottest surface temperature?"
          />
        </Field>
        <Field
          label="Correct answer"
          error={touched && missing.correct ? "Required" : undefined}
        >
          <TextField
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            invalid={touched && missing.correct}
            disabled={busy}
            placeholder="Venus"
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
                    const next = [...prev] as typeof prev;
                    next[i] = e.target.value;
                    return next;
                  })
                }
                invalid={touched && missing.wrong[i]}
                disabled={busy}
                aria-label={`Wrong answer ${i + 1}`}
                placeholder={["Mercury", "Mars", "Jupiter"][i]}
              />
            ))}
          </div>
        </Field>
        <div className="flex gap-3">
          <Field label="Category" optional>
            <TextField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              placeholder="Science: Planets"
            />
          </Field>
          <Field label="Difficulty" optional>
            <TextField
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={busy}
              placeholder="easy"
            />
          </Field>
        </div>
        {saveFailed && (
          <p className="text-sec font-bold text-crit">
            Couldn’t save — try again.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={submit}
            className={cx(busy && "inline-flex items-center gap-2")}
          >
            {busy && <Spinner label="Saving" />}
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </motion.div>
    </ModalShell>
  );
}

export function AdminQuestionsMockup(): React.JSX.Element {
  const [view, setView] = useState<BankView>("loaded");
  const [failSaves, setFailSaves] = useState(false);
  const [questions, setQuestions] = useState(FAKE_QUESTIONS);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    DIFFICULTY_FILTERS[0],
  );
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<MockQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const total = SEEDED_TOTAL - (FAKE_QUESTIONS.length - questions.length);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const searching = query.trim() !== "";
  const byDifficulty = difficulty !== "any difficulty";
  const filtering = searching || byDifficulty;
  const matches = useMemo(
    () =>
      questions.filter(
        (q) =>
          q.prompt.toLowerCase().includes(query.trim().toLowerCase()) &&
          (!byDifficulty || q.difficulty === difficulty),
      ),
    [questions, query, byDifficulty, difficulty],
  );
  const lastPageSize = total % PAGE_SIZE || PAGE_SIZE;
  const pageRows = filtering
    ? matches
    : page === pageCount
      ? questions.slice(0, lastPageSize)
      : questions;
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = rangeStart + pageRows.length - 1;

  const openEditor = (target: EditorTarget) => {
    setEditor(target);
    setEditorKey((k) => k + 1);
  };

  const confirmDelete = () => {
    setDeleteBusy(true);
    deleteTimer.current = setTimeout(() => {
      setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget?.id));
      setDeleteBusy(false);
      setDeleteTarget(null);
    }, FAKE_SAVE_MS);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-s1">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
          <div className="flex flex-col gap-1">
            <span className="text-meta font-bold uppercase tracking-widest text-s7">
              Mockup · /admin/questions
            </span>
            <h1 className="font-display text-2xl uppercase text-s12">
              Question bank
            </h1>
            <p className="text-sec text-s9">
              Trivia questions dealt to every game. Edits never touch matches
              already running.
            </p>
          </div>

          <div className="flex items-stretch gap-3">
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts"
              aria-label="Search prompts"
              className="min-w-0 flex-1"
              disabled={view !== "loaded"}
            />
            <DifficultyFilter
              value={difficulty}
              onChange={setDifficulty}
              disabled={view !== "loaded"}
            />
            <Button
              variant="primary"
              onClick={() => openEditor({ mode: "new" })}
              disabled={view === "loading" || view === "error"}
            >
              New question
            </Button>
          </div>

          <div className="overflow-hidden border-2 border-s6 bg-s2">
            <div className="flex items-center justify-between border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
              <span>Question</span>
              <span>
                {view === "loaded" && !filtering && `${total} total`}
                {view === "loaded" &&
                  filtering &&
                  `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
              </span>
            </div>

            {view === "loading" && <SkeletonRows />}

            {view === "error" && (
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <p className="text-sec font-bold text-crit">
                  ✗ Couldn’t load the question bank.
                </p>
                <Button variant="outline" onClick={() => setView("loaded")}>
                  Retry
                </Button>
              </div>
            )}

            {view === "empty" && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-sec font-bold text-s11">No questions yet.</p>
                <p className="max-w-sm text-sec text-s9">
                  Run{" "}
                  <code className="font-mono text-s10">
                    npm run seed:trivia
                  </code>{" "}
                  to import the starter bank, or write the first one.
                </p>
                <Button
                  variant="primary"
                  onClick={() => openEditor({ mode: "new" })}
                >
                  New question
                </Button>
              </div>
            )}

            {view === "loaded" && filtering && matches.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="text-sec text-s9">
                  No questions match{" "}
                  {[
                    searching && `“${query.trim()}”`,
                    byDifficulty && difficulty,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  .
                </p>
                <Button
                  variant="text"
                  onClick={() => {
                    setQuery("");
                    setDifficulty(DIFFICULTY_FILTERS[0]);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}

            {view === "loaded" && pageRows.length > 0 && (
              <ul className="divide-y-2 divide-s6">
                {pageRows.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sec text-s11">{q.prompt}</p>
                      <MetaLine q={q} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        icon
                        aria-label={`Edit: ${q.prompt}`}
                        onClick={() =>
                          openEditor({ mode: "edit", question: q })
                        }
                      >
                        ✎
                      </Button>
                      <Button
                        variant="ghost"
                        icon
                        aria-label={`Delete: ${q.prompt}`}
                        onClick={() => setDeleteTarget(q)}
                      >
                        ✕
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {view === "loaded" && !filtering && (
              <div className="flex items-center justify-between border-t-2 border-s6 px-4 py-2">
                <span className="text-caps uppercase tracking-widest text-s7">
                  {rangeStart}–{rangeEnd} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Prev
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page === pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {editor && (
          <EditorModal
            key={editorKey}
            target={editor}
            failSaves={failSaves}
            onClose={() => setEditor(null)}
            onSave={(saved) => {
              setQuestions((prev) =>
                editor.mode === "edit"
                  ? prev.map((q) => (q.id === saved.id ? saved : q))
                  : [saved, ...prev],
              );
              setEditor(null);
            }}
          />
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Delete question?"
          description={
            deleteTarget
              ? `“${deleteTarget.prompt}” leaves the bank permanently. Matches already dealt keep their copy.`
              : undefined
          }
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onClose={() => {
            clearTimeout(deleteTimer.current);
            setDeleteBusy(false);
            setDeleteTarget(null);
          }}
        />

        <Card className="fixed bottom-4 left-4 z-(--z-sticky) flex w-64 flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-s10">
            Bank state
            <Select
              options={BANK_VIEWS}
              value={view}
              onChange={(v) => setView(v as BankView)}
              aria-label="Bank state"
            />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            Fail saves
            <Toggle
              on={failSaves}
              onChange={setFailSaves}
              aria-label="Fail saves"
            />
          </label>
          <Button
            onClick={() => {
              setQuestions(FAKE_QUESTIONS);
              setQuery("");
              setDifficulty(DIFFICULTY_FILTERS[0]);
              setPage(1);
              setView("loaded");
            }}
          >
            Reset
          </Button>
        </Card>
      </div>
    </MotionConfig>
  );
}
