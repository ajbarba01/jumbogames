/**
 * Pointer handling for tracing a word across the grid. Drag and tap-to-step run
 * through one path builder, so a trace interrupted mid-drag can be finished by
 * tapping; re-entering the previous tile backtracks, which is how a misdrag is
 * corrected without restarting.
 *
 * The live path is held in a ref and mirrored into state for rendering, rather
 * than read back out of a `setPath` updater. React invokes an updater during
 * the render pass — and twice over in development — so a submission made from
 * inside one dispatched the released word twice (the second copy bouncing off
 * the word the first had just captured, which surfaced as "blocked" on every
 * successful trace) and mutated the match container mid-render. The ref keeps
 * the release handler's read of the current path outside render entirely.
 */
"use client";
import { useCallback, useRef, useState } from "react";
import { neighbors } from "@jumbo/engine";

export function extendPath(
  path: number[],
  tile: number,
  side: number,
): number[] {
  if (path.length === 0) return [tile];
  if (path.length >= 2 && tile === path[path.length - 2]) {
    return path.slice(0, -1);
  }
  if (path.includes(tile)) return path;
  if (!neighbors(path[path.length - 1]!, side).includes(tile)) return path;
  return [...path, tile];
}

export function useTrace(input: {
  side: number;
  letters: string;
  onSubmit: (path: number[]) => void;
}): {
  path: number[];
  word: string;
  onTileDown: (tile: number) => void;
  onTileEnter: (tile: number) => void;
  onRelease: () => void;
} {
  const [path, setPath] = useState<number[]>([]);
  const [dragging, setDragging] = useState(false);
  // The authoritative path. `path` state exists only so a change repaints.
  const pathRef = useRef<number[]>([]);

  const write = useCallback((next: number[]) => {
    pathRef.current = next;
    setPath(next);
  }, []);

  const onTileDown = useCallback(
    (tile: number) => {
      setDragging(true);
      // No empty-path branch here: extendPath already owns that base case,
      // and a second copy of it can drift from the first.
      write(extendPath(pathRef.current, tile, input.side));
    },
    [input.side, write],
  );

  const onTileEnter = useCallback(
    (tile: number) => {
      if (!dragging) return;
      write(extendPath(pathRef.current, tile, input.side));
    },
    [dragging, input.side, write],
  );

  const onRelease = useCallback(() => {
    setDragging(false);
    const released = pathRef.current;
    write([]);
    if (released.length >= 3) input.onSubmit(released);
    // Keyed on `onSubmit` alone, not the whole `input` object: callers pass a
    // fresh object literal every render, so keying on `input` itself would
    // re-register Grid's window-level pointerup listener on every render
    // regardless of whether anything this callback actually reads changed.
    // Keying on the primitive means this only churns when `onSubmit` itself
    // does — which still happens on a genuine game-state tick, since
    // `onSubmit` closes over the current board and must. Nothing else this
    // reads can go stale: the path comes from a ref and `write` is constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.onSubmit, write]);

  return {
    path,
    word: path.map((tile) => input.letters[tile] ?? "").join(""),
    onTileDown,
    onTileEnter,
    onRelease,
  };
}
