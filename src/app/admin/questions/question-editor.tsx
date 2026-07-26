/**
 * Editor modal for one question — create and edit share it: it owns the draft,
 * the required-field validation, the POST/PATCH request, its busy state and its
 * failure, so the manager only has to say which question is being written.
 * A rejected submit and a failed save both fire the register's rejection shake.
 */
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Button,
  Field,
  ModalShell,
  SLIP_SHAKE,
  Select,
  Spinner,
  StatusLine,
  TextField,
  Textarea,
  cx,
} from "@jumbo/ui";
import {
  DIFFICULTY_CHOICES,
  NO_DIFFICULTY,
  readError,
  type DifficultyChoice,
  type Question,
  type QuestionPayload,
} from "./types";

/** One pass of the kit's rejection shake, in seconds. */
const SHAKE_DUR = 0.4;

const WRONG_PLACEHOLDERS = ["Mercury", "Mars", "Jupiter"] as const;

export function QuestionEditor({
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
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(
    (source?.difficulty as DifficultyChoice | null) ?? NO_DIFFICULTY,
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakes, setShakes] = useState(0);

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
      setShakes((n) => n + 1);
      return;
    }
    setBusy(true);
    setError(null);
    const payload: QuestionPayload = {
      prompt: prompt.trim(),
      correctAnswer: correctAnswer.trim(),
      incorrectAnswers: wrong.map((w) => w.trim()) as [string, string, string],
      category: category.trim() || undefined,
      // Omitted, not nulled: the PATCH schema is `.partial()`, so a question
      // that already carries a level keeps it (ROADMAP known gap).
      difficulty: difficulty === NO_DIFFICULTY ? undefined : difficulty,
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
    setShakes((n) => n + 1);
  }

  const title = state.mode === "edit" ? "Edit question" : "New question";

  return (
    <ModalShell
      open
      onClose={onClose}
      aria-label={title}
      className="flex max-h-[calc(100dvh-2rem)] w-112 max-w-[calc(100vw-2rem)] flex-col overflow-y-auto"
    >
      {/* Remounting on every shake is what replays the keyframes — the count is
          the key, not a value the animation reads. */}
      <motion.div
        key={shakes}
        animate={shakes > 0 ? { x: [...SLIP_SHAKE] } : undefined}
        transition={{ duration: SHAKE_DUR }}
        className="flex flex-col gap-4 p-6"
      >
        <h2 className="font-display text-xl uppercase">{title}</h2>
        {/* The kit Field is a plain wrapper, so every control below carries its
            own aria-label — that is its accessible name, not the caps label. */}
        <Field
          label="Prompt"
          error={touched && missing.prompt ? "Required" : undefined}
        >
          <Textarea
            aria-label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            invalid={touched && missing.prompt}
            disabled={busy}
            placeholder="Which planet has the hottest surface temperature?"
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
            aria-label="Correct answer"
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
                    const next = [...prev] as [string, string, string];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                invalid={touched && missing.wrong[i]}
                disabled={busy}
                aria-label={`Wrong answer ${i + 1}`}
                placeholder={WRONG_PLACEHOLDERS[i]}
              />
            ))}
          </div>
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field label="Category" detail="optional" className="flex-1 basis-40">
            <TextField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              aria-label="Category"
              placeholder="Science: Planets"
            />
          </Field>
          <Field
            label="Difficulty"
            detail="optional"
            className="flex-1 basis-40"
          >
            <Select
              options={DIFFICULTY_CHOICES}
              value={difficulty}
              onChange={(v) => setDifficulty(v as DifficultyChoice)}
              size="field"
              disabled={busy}
              aria-label="Difficulty"
            />
          </Field>
        </div>
        {error ? (
          <StatusLine tone="crit" live>
            {error}
          </StatusLine>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void submit()}
            className={cx(busy && "inline-flex items-center gap-2")}
          >
            {busy ? <Spinner label="Saving" /> : null}
            {busy ? "Saving…" : "Save question"}
          </Button>
        </div>
      </motion.div>
    </ModalShell>
  );
}
