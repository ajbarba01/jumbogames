// @vitest-environment jsdom
/**
 * WipeProvider: the seam between the pure wipe machine and React's transition.
 * The machine is tested directly in src/lib/wipe/machine.test.ts; what is
 * covered here is the signal the provider derives from `useTransition` — the
 * "committed" edge — including the case where the covered action schedules no
 * update at all, which supplies no edge to wait for.
 */
import { useEffect, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WipeProvider } from "./WipeProvider";
import { useWipeNav } from "./use-wipe-nav";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => refresh(), push: vi.fn() }),
}));

vi.mock("motion/react", () => ({ useReducedMotion: () => false }));

// Whether the panel double reports its sweeps, standing in for an animation
// callback that gets dropped.
const sweepsReport = { current: true };

// Stand in for the real panel, whose sweeps are motion-driven and never
// complete under jsdom: report "covered" as soon as the in-sweep is asked for,
// and "uncovered" as soon as the out-sweep is. The provider's timing logic is
// what is under test, not the animation.
vi.mock("@jumbo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@jumbo/ui")>();
  return {
    ...actual,
    SlamWipe: ({
      phase,
      onCovered,
      onUncovered,
    }: {
      phase: "in" | "covered" | "out";
      onCovered: () => void;
      onUncovered: () => void;
    }) => {
      useEffect(() => {
        if (!sweepsReport.current) return;
        if (phase === "in") onCovered();
        if (phase === "out") onUncovered();
      }, [phase, onCovered, onUncovered]);
      return <div data-testid="slam-wipe" />;
    },
  };
});

/** Exposes cover() to the test and can run a real state update under it. */
function Harness(): React.JSX.Element {
  const { cover } = useWipeNav();
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => cover(() => refresh())}>cover inert</button>
      <button
        onClick={() =>
          cover(() => {
            refresh();
            setN((v) => v + 1);
          })
        }
      >
        cover updating
      </button>
      <span data-testid="n">{n}</span>
    </>
  );
}

function renderProvider() {
  return render(
    <WipeProvider>
      <Harness />
    </WipeProvider>,
  );
}

describe("WipeProvider", () => {
  beforeEach(() => {
    refresh.mockClear();
    sweepsReport.current = true;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals once the covered action commits and the min floor passes", async () => {
    renderProvider();
    await act(async () => {
      screen.getByText("cover updating").click();
    });
    expect(screen.getByTestId("slam-wipe")).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId("slam-wipe")).toBeNull();
  });

  it("reveals when the covered action schedules no update", async () => {
    // A router.refresh() that Next dedupes against one already in flight (a
    // Realtime broadcast's bare refresh landing during the in-sweep) starts no
    // transition, so isPending never flips and there is no settle edge. The
    // panel must still come down on the min floor rather than holding the
    // screen until the 15s force-reveal ceiling.
    renderProvider();
    await act(async () => {
      screen.getByText("cover inert").click();
    });
    expect(screen.getByTestId("slam-wipe")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId("slam-wipe")).toBeNull();
  });

  it("comes down even if the sweeps never report completing", async () => {
    // Both sweep callbacks come from a motion animation, and an animation
    // callback is droppable: an interrupted or frame-starved sweep never
    // reports. onCovered is where the machine arms every escape timer,
    // including the force-reveal ceiling, so a dropped in-sweep callback used
    // to leave no way out at all — an opaque panel over the app, forever.
    sweepsReport.current = false;
    renderProvider();
    await act(async () => {
      screen.getByText("cover updating").click();
    });
    expect(screen.getByTestId("slam-wipe")).toBeTruthy();

    // Each fallback arms the next phase's, so the clock is advanced in steps
    // with a render between: in-sweep fallback, min floor, out-sweep fallback.
    // All of it well inside the 15s force-reveal ceiling — which the E2E
    // suite's own patience (15s) could never outwait anyway.
    for (let step = 0; step < 3; step++) {
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
    }
    expect(screen.queryByTestId("slam-wipe")).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
