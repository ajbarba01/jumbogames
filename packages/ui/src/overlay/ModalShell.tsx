/** The modal ground: scrim-backed, focus-trapped dialog card wired into the kit's Escape layer stack. */
"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cx } from "../cx";
import { useDismissLayer } from "./layers";

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  "aria-label": string;
  /** Sizes the card (e.g. 'flex h-[70%] w-[70%] flex-col', 'w-96 pb-2'). */
  className?: string;
  children?: React.ReactNode;
}

/** The modal ground: scrim + heavy-shadow card. Base UI owns the focus trap,
 *  scroll lock, and scrim-press dismissal; Escape ordering runs through the
 *  kit's layer stack. The popup is a pointer-transparent centering frame and
 *  the card animates inside it — an entrance keyframe on the popup itself
 *  would clobber a centering transform mid-animation. */
export function ModalShell({
  open,
  onClose,
  className,
  children,
  ...aria
}: ModalShellProps): React.JSX.Element {
  useDismissLayer(open, onClose);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        // Same escape contract as PopoverCard: swallow Base UI's own escape
        // close and let the keydown bubble on to the stack's window listener.
        if (!next && details.reason === "escape-key") {
          details.allowPropagation();
          return;
        }
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--z-modal-backdrop) bg-scrim" />
        <Dialog.Popup
          className="pointer-events-none fixed inset-0 z-(--z-modal) flex items-center justify-center outline-none"
          {...aria}
        >
          <div
            className={cx(
              // A big PAPER sticker over the scrim: cream ground, edge
              // border, heavy hard shadow. Modal content is ink on paper —
              // text-s2 is the inherited default, and ground-adaptive
              // variants (ghost/text/outline) follow it.
              "slip-enter sticker pointer-events-auto overflow-hidden rounded-r4 bg-s12 text-s2 shadow-modal",
              className,
            )}
          >
            {children}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
