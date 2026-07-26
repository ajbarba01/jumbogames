/**
 * Delete confirmation for one question: owns the DELETE request, its busy
 * state, and its failure, so the manager only has to say which question is
 * being removed.
 */
"use client";

import { useState } from "react";
import { ConfirmDialog } from "@jumbo/ui";
import { readError, type Question } from "./types";

export function DeleteQuestionDialog({
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
    // ConfirmDialog keeps its actions enabled while an error is showing, so a
    // retry has to clear the stale line rather than leave it under the spinner.
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
    <ConfirmDialog
      open
      title="Delete question?"
      description={`“${question.prompt}” leaves the bank permanently. Matches already dealt keep their copy.`}
      confirmLabel="Delete question"
      busy={busy}
      error={error ?? undefined}
      onConfirm={() => void confirm()}
      onClose={onClose}
    />
  );
}
