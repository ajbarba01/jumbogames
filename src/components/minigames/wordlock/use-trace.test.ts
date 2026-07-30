// @vitest-environment jsdom
/**
 * Tests for extendPath: the pure path builder behind drag and tap-to-step
 * tracing, including that it never mutates the array it was handed. Plus the
 * hook around it, where the property that matters is a scheduling one: a
 * release must submit exactly once, from an event handler, never from inside
 * a state updater — React runs an updater during the render pass and runs it
 * twice in development, which both dispatched the same word twice (the second
 * copy bouncing off the word the first one had just captured) and mutated the
 * match container mid-render.
 */
import { StrictMode, createElement } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { extendPath, useTrace } from "./use-trace";

describe("extendPath", () => {
  const side = 4;

  it("starts a path", () => {
    expect(extendPath([], 5, side)).toEqual([5]);
  });

  it("appends an adjacent tile, diagonals included", () => {
    expect(extendPath([5], 6, side)).toEqual([5, 6]);
    expect(extendPath([5], 10, side)).toEqual([5, 10]);
  });

  it("ignores a non-adjacent tile", () => {
    expect(extendPath([5], 15, side)).toEqual([5]);
  });

  it("backtracks when re-entering the previous tile", () => {
    expect(extendPath([5, 6], 5, side)).toEqual([5]);
  });

  it("ignores a tile already in the path that is not the previous one", () => {
    expect(extendPath([5, 6, 7], 5, side)).toEqual([5, 6, 7]);
  });

  it("does not mutate the path it was given", () => {
    // Assert on the array actually passed in. Checking a copy made before the
    // call proves nothing — the copy was never reachable from the function.
    // Freezing catches an in-place write (modules run in strict mode), and
    // the contents check catches anything freeze would not.
    const path = Object.freeze([5, 6]) as unknown as number[];
    expect(extendPath(path, 7, side)).toEqual([5, 6, 7]);
    expect(path).toEqual([5, 6]);
  });
});

describe("useTrace", () => {
  /** Renders under StrictMode on purpose: that is what double-invokes a state
   *  updater, which is exactly how a submission hidden inside one turns into
   *  two dispatches of the same word. */
  function trace(onSubmit: (path: number[]) => void) {
    return renderHook(
      () => useTrace({ side: 4, letters: "ABCDEFGHIJKLMNOP", onSubmit }),
      {
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(StrictMode, null, children),
      },
    );
  }

  function drag(
    result: { current: ReturnType<typeof useTrace> },
    tiles: number[],
  ): void {
    act(() => result.current.onTileDown(tiles[0]!));
    for (const tile of tiles.slice(1)) {
      act(() => result.current.onTileEnter(tile));
    }
  }

  it("submits a released trace exactly once", () => {
    const onSubmit = vi.fn();
    const { result } = trace(onSubmit);

    drag(result, [0, 1, 2]);
    act(() => result.current.onRelease());

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith([0, 1, 2]);
  });

  it("clears the path on release and does not resubmit on a later empty release", () => {
    const onSubmit = vi.fn();
    const { result } = trace(onSubmit);

    drag(result, [0, 1, 2]);
    act(() => result.current.onRelease());
    act(() => result.current.onRelease());

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(result.current.path).toEqual([]);
    expect(result.current.word).toBe("");
  });

  it("does not submit a trace shorter than three tiles", () => {
    const onSubmit = vi.fn();
    const { result } = trace(onSubmit);

    drag(result, [0, 1]);
    act(() => result.current.onRelease());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.path).toEqual([]);
  });

  it("reads the word off the letters at the traced tiles", () => {
    const { result } = trace(vi.fn());
    drag(result, [0, 1, 5]);
    expect(result.current.word).toBe("ABF");
  });
});
