// @vitest-environment jsdom
/**
 * Tests for the board's pointer wiring: that a touch pointerdown's implicit
 * capture (Pointer Events spec) gets released immediately, since a captured
 * pointer would confine every later pointer event to the tile it started on
 * and cap every traced path at length 1 on touch while behaving perfectly
 * under a mouse; that every Snake polyline is pointer-transparent, which is
 * the mechanism that lets a pointerdown on a captured tile reach the rect
 * underneath instead of the chain drawn through it; that hit-testing follows
 * the pointer's whole route and extends onto every tile it crossed, while the
 * corner deadzone keeps a diagonal from picking up the two tiles it clips on
 * the way; and that letters paint after every Snake in document order, which
 * is what keeps them readable. jsdom does no layout
 * and does not honour CSS `pointer-events` for event routing, so it cannot
 * exercise "does the browser actually deliver the event to the tile" end to
 * end — that is confirmed separately in the manual browser pass — but it can
 * and does confirm the property the fix depends on is actually set.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import type { MatchTeam, WordLockView } from "@jumbo/engine";
import { Grid } from "./Grid";
import { willRefresh } from "./RefreshFrame";

/** Stubs the rendered SVG's on-screen box so pointer coordinates convert to
 *  board (viewBox) space deterministically — jsdom lays out nothing by
 *  default, so `getBoundingClientRect` reports all zeros unless told
 *  otherwise. `boardPx` is `side * 44` (Grid's own `CELL`). */
function stubSvgBounds(svg: Element, boardPx: number): void {
  Object.defineProperty(svg, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: boardPx,
      bottom: boardPx,
      width: boardPx,
      height: boardPx,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    configurable: true,
  });
}

const teamA: MatchTeam = {
  id: "ta",
  name: "Team A",
  colorIndex: 1,
  members: ["p1"],
};
const teamB: MatchTeam = {
  id: "tb",
  name: "Team B",
  colorIndex: 2,
  members: ["p2"],
};

function view(partial: Partial<WordLockView> = {}): WordLockView {
  return {
    side: 2,
    letters: "ABCD",
    stale: "1111",
    seed: "s",
    epoch: 0,
    startedAt: 0,
    words: [],
    scores: {},
    teamA: ["p1"],
    teamB: ["p2"],
    played: [],
    lastReject: null,
    ...partial,
  };
}

function renderGrid(overrides: {
  view?: WordLockView;
  path?: number[];
  onTileDown?: (tile: number) => void;
  onTileEnter?: (tile: number) => void;
  onRelease?: () => void;
}) {
  const boardView = overrides.view ?? view();
  const onTileDown = overrides.onTileDown ?? vi.fn();
  const onTileEnter = overrides.onTileEnter ?? vi.fn();
  const onRelease = overrides.onRelease ?? vi.fn();
  const result = render(
    <Grid
      view={boardView}
      teamA={teamA}
      teamB={teamB}
      path={overrides.path ?? []}
      traceValid={false}
      flashTiles={null}
      refreshProgress={0}
      onTileDown={onTileDown}
      onTileEnter={onTileEnter}
      onRelease={onRelease}
    />,
  );
  const tiles = result.container.querySelectorAll("rect");
  const svg = result.container.querySelector("svg")!;
  stubSvgBounds(svg, boardView.side * 44);
  return { ...result, tiles, svg, onTileDown, onTileEnter, onRelease };
}

describe("Grid pointer wiring", () => {
  it("renders and handles a touch pointerdown without throwing, even though jsdom has no pointer-capture API", () => {
    // jsdom implements neither hasPointerCapture nor releasePointerCapture at
    // all (confirmed: calling either throws "is not a function"), so the
    // feature-detection this fix relies on is exercised for real here, not
    // simulated.
    const { tiles, onTileDown } = renderGrid({});
    expect(() =>
      fireEvent.pointerDown(tiles[0]!, { pointerId: 1, pointerType: "touch" }),
    ).not.toThrow();
    expect(onTileDown).toHaveBeenCalledWith(0);
  });

  it("releases an active touch pointer capture on pointerdown", () => {
    const { tiles, onTileDown } = renderGrid({});
    const release = vi.fn();
    // Simulate what a real touch-capable browser does: implicit capture has
    // already landed on this element by the time pointerdown reaches our
    // handler. jsdom has no such API by default, so it is stubbed here to
    // model a browser that does.
    Object.defineProperty(tiles[0]!, "releasePointerCapture", {
      value: release,
      configurable: true,
    });

    fireEvent.pointerDown(tiles[0]!, { pointerId: 7, pointerType: "touch" });

    expect(release).toHaveBeenCalledWith(7);
    expect(onTileDown).toHaveBeenCalledWith(0);
  });

  it("swallows a release that throws because the pointer was never actually captured", () => {
    const { tiles, onTileDown } = renderGrid({});
    Object.defineProperty(tiles[0]!, "releasePointerCapture", {
      value: vi.fn(() => {
        throw new DOMException("no capture", "NotFoundError");
      }),
      configurable: true,
    });

    expect(() =>
      fireEvent.pointerDown(tiles[0]!, { pointerId: 3, pointerType: "touch" }),
    ).not.toThrow();
    expect(onTileDown).toHaveBeenCalledWith(0);
  });

  it("still extends onto a second tile once capture is released, completing the drag", () => {
    // The release is the one thing Grid's own code is responsible for; once
    // released, routing the move to whatever the finger is over is the
    // browser's job per the Pointer Events spec — the same contract a mouse
    // drag already relies on. This proves Grid's side of that contract: the
    // handlers it wires keep working past the first tile. Tile centres on
    // the default 2x2, 44px-cell board: 0 (22,22), 1 (66,22), 2 (22,66).
    const { tiles, svg, onTileDown, onTileEnter } = renderGrid({});
    Object.defineProperty(tiles[0]!, "releasePointerCapture", {
      value: vi.fn(),
      configurable: true,
    });

    fireEvent.pointerDown(tiles[0]!, { pointerId: 9, pointerType: "touch" });
    fireEvent.pointerMove(svg, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 66,
      clientY: 22,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 22,
      clientY: 66,
    });

    expect(onTileDown).toHaveBeenCalledWith(0);
    expect(onTileEnter).toHaveBeenCalledWith(1);
    expect(onTileEnter).toHaveBeenCalledWith(2);
  });

  it("renders every Snake polyline pointer-transparent, so it cannot intercept a pointerdown meant for the tile beneath it", () => {
    // A same-node `fireEvent.pointerDown` on the rect would pass even before
    // the fix: jsdom does no layout and does not honour CSS `pointer-events`
    // for event routing, so dispatching directly on the rect never exercises
    // whatever is painted on top of it in a real browser. The actual
    // mechanism is this property on the polyline itself — before the fix, no
    // Snake set it, so a real browser routed the pointerdown to the chain
    // instead of the tile underneath and a trace could never start on an
    // already-captured tile.
    const captured = view({
      words: [{ path: [0], word: "A", by: "p1", side: "A" }],
    });
    const { container } = renderGrid({ view: captured });

    const polylines = container.querySelectorAll("polyline");
    expect(polylines.length).toBeGreaterThan(0);
    for (const polyline of polylines) {
      expect((polyline as SVGElement).style.pointerEvents).toBe("none");
    }
  });

  it("extends the path diagonally when a move lands on a diagonal tile", () => {
    // Tile 3's centre is (66, 66), well clear of the shared corner at
    // (44, 44) and so outside the deadzone.
    const { svg, onTileDown, onTileEnter } = renderGrid({ path: [0] });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 66,
      clientY: 66,
    });

    expect(onTileDown).not.toHaveBeenCalled();
    expect(onTileEnter).toHaveBeenCalledWith(3);
  });

  it("extends onto a neighbour entered anywhere but its corners, however shallow the angle", () => {
    // (45, 22) is one pixel over the 0/1 boundary, at mid-height — nowhere
    // near a corner. The player has moved into tile 1 and the trace has to
    // follow: the previous rule, which required landing near a tile's centre,
    // left a band all around the outside of every tile that extended onto
    // nothing, and a drag angled to stay in that band stopped tracking the
    // finger for the rest of the gesture.
    const { svg, onTileEnter } = renderGrid({ path: [0] });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 45,
      clientY: 22,
    });

    expect(onTileEnter).toHaveBeenCalledWith(1);
  });

  it("does not extend onto the tiles a diagonal drag clips at the corner they share", () => {
    // The whole point of the deadzone: dragging 0 → 3 crosses the corner at
    // (44, 44), which belongs to tiles 1 and 2 as much as to 0 and 3. Taking
    // either of them would turn the diagonal the player drew into an L. The
    // route below bows toward tile 1 the way a real hand does — a
    // mathematically exact diagonal would prove nothing, since it only ever
    // occupies tiles 0 and 3 and so cannot distinguish the deadzone from its
    // absence.
    const { svg, onTileEnter } = renderGrid({ path: [0] });
    for (const [cx, cy] of [
      [22, 22],
      [35, 30],
      [48, 38],
      [58, 50],
      [66, 66],
    ]) {
      fireEvent.pointerMove(svg, {
        pointerId: 1,
        pointerType: "mouse",
        clientX: cx,
        clientY: cy,
      });
    }

    expect(onTileEnter).not.toHaveBeenCalledWith(1);
    expect(onTileEnter).not.toHaveBeenCalledWith(2);
    expect(onTileEnter).toHaveBeenCalledWith(3);
  });

  it("fills in a tile the pointer crossed between two move events", () => {
    // One event at (22, 22) and the next at (22, 110) on a 3x3 board: the
    // pointer crossed tile 3 without ever reporting a position inside it.
    // Unsampled, tile 6 arrives non-adjacent to the path's tail, `extendPath`
    // refuses it, and the trace is stranded for the rest of the drag.
    const board = view({ side: 3, letters: "ABCDEFGHI", stale: "111111111" });
    const { svg, onTileEnter } = renderGrid({ view: board, path: [0] });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 22,
      clientY: 22,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 22,
      clientY: 110,
    });

    expect(onTileEnter).toHaveBeenCalledWith(3);
    expect(onTileEnter).toHaveBeenCalledWith(6);
  });

  it("anchors interpolation at the press, so a fast first move still fills in", () => {
    // The press is the only report of where a gesture began — a touch gesture
    // sends no moves before it. Resetting the route on pointerdown without
    // anchoring it there leaves the first move nothing to interpolate from,
    // which strands a quick flick on the tile it started from.
    const board = view({ side: 3, letters: "ABCDEFGHI", stale: "111111111" });
    const { tiles, svg, onTileEnter } = renderGrid({ view: board, path: [0] });

    fireEvent.pointerDown(tiles[0]!, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 22,
      clientY: 22,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 22,
      clientY: 110,
    });

    expect(onTileEnter).toHaveBeenCalledWith(3);
    expect(onTileEnter).toHaveBeenCalledWith(6);
  });

  it("draws the trace from its very first tile, as a dot", () => {
    // A single point is not a line: an unsampled one-tile path paints nothing
    // at all, so the press that starts a trace looked like a miss. The dot is
    // a zero-length segment under a round cap, which needs the point twice.
    const { container } = renderGrid({ path: [2] });
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute("points")).toBe("22,66 22,66");
    expect(polyline!.getAttribute("stroke-linecap")).toBe("round");
  });

  it("commits a release from outside the board via the window listener", () => {
    const onRelease = vi.fn();
    renderGrid({ onRelease });
    fireEvent.pointerUp(window);
    expect(onRelease).toHaveBeenCalledOnce();
  });

  it("paints every letter after every Snake in document order", () => {
    // Paint order, not styling, is the fix: a captured tile's letter must be
    // a later sibling than the polyline drawn through it so it renders on
    // top. A live word supplies a captured-word Snake and a two-tile path
    // supplies the in-progress trace's Snake.
    const captured = view({
      words: [{ path: [0], word: "A", by: "p1", side: "A" }],
    });
    const { container } = renderGrid({ view: captured, path: [1, 3] });

    const svg = container.querySelector("svg")!;
    const painted = Array.from(svg.querySelectorAll("polyline, text"));
    const lastPolyline = painted.findLastIndex(
      (node) => node.tagName === "polyline",
    );
    const firstText = painted.findIndex((node) => node.tagName === "text");

    expect(painted.some((node) => node.tagName === "polyline")).toBe(true);
    expect(painted.some((node) => node.tagName === "text")).toBe(true);
    expect(lastPolyline).toBeLessThan(firstText);
  });
});

describe("willRefresh", () => {
  // Pinned as a pure predicate rather than through rendering: styling can
  // change freely, but the rule for which tile gets a bar at all must keep
  // matching `advanceRefresh`'s own condition exactly.
  it("qualifies a tile that is neutral now and was stale at the previous tick", () => {
    expect(willRefresh(-1, "1")).toBe(true);
  });

  it("does not qualify a neutral tile that was not stale at the previous tick", () => {
    expect(willRefresh(-1, "0")).toBe(false);
  });

  it("never qualifies a captured tile, stale or not", () => {
    expect(willRefresh(0, "1")).toBe(false);
    expect(willRefresh(0, "0")).toBe(false);
  });
});
