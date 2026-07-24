/**
 * Home identity card: the signed-in user's display name as the primary line,
 * editable in place. Read state shows the name with a pencil icon-button; edit
 * state swaps to a TextField with Save/Cancel, validating locally (mirrors
 * displayNameSchema — the server re-validates) and persisting through the
 * self-only PATCH /api/profile. The identity card is quiet chrome, so a rejected
 * save reports as inline text, never the rejection-shake moment (docs/UI.md).
 */
"use client";

import { useState } from "react";
import { Button, Spinner, TextField } from "@jumbo/ui";
import { displayNameSchema } from "@/lib/schemas/auth";

export function DisplayNameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function open() {
    setDraft(name);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    if (pending) return;
    setEditing(false);
    setError(null);
  }

  async function save() {
    const parsed = displayNameSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Use 1–30 characters.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: parsed.data }),
    });
    setPending(false);
    if (res.ok) {
      setName(parsed.data);
      setEditing(false);
    } else {
      setError("Could not save. Try again.");
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-body text-s11">{name}</span>
        <button
          type="button"
          onClick={open}
          aria-label="Edit display name"
          className="slip cursor-pointer text-s8 hover:text-s11"
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") cancel();
      }}
      noValidate
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      {/* min-w-0 lets the form shrink to its share of the identity row — without
          it the editor's intrinsic width wins and shoves the role tag out of the
          card. Wrapping drops the buttons below the field when the row is too
          narrow to hold all three. */}
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          aria-label="Display name"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          invalid={error !== null}
          aria-invalid={error !== null}
          aria-describedby={error ? "display-name-error" : undefined}
          disabled={pending}
          autoFocus
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={pending || draft.trim() === "" || draft.trim() === name}
          className="inline-flex items-center gap-2"
        >
          {pending && <Spinner label="Saving" />}
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={cancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p id="display-name-error" role="alert" className="text-meta text-crit">
          {error}
        </p>
      ) : null}
    </form>
  );
}
