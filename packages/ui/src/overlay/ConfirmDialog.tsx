/**
 * Confirmation dialog: a titled ModalShell with a cancel/confirm pair, for
 * actions that should not fire on a single click (ending a tournament, removing
 * a team). Weight is carried by the copy, not by color — the register reserves
 * crit for live state, so the confirm button is the ordinary accent action.
 * Cancel comes first so the focus trap lands there, not on the destructive path.
 */
"use client";

import { Button } from "../actions/Button";
import { ModalShell } from "./ModalShell";

export interface ConfirmDialogProps {
  open: boolean;
  /** Names the dialog and states the action, e.g. "End tournament?". */
  title: string;
  /** Optional line spelling out the consequence. */
  description?: string;
  /** Confirm button copy. */
  confirmLabel?: string;
  /** Cancel button copy. */
  cancelLabel?: string;
  /** Disables both actions while the confirmed request is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      aria-label={title}
      className="w-96"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl uppercase">{title}</h2>
        {description ? <p className="text-sec text-s4">{description}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
