// @vitest-environment jsdom
/**
 * SkeletonRows specs: it renders the requested row count, hides itself from
 * assistive tech, and collapses its pulse under reduced motion.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonRows } from "./SkeletonRows";

describe("SkeletonRows", () => {
  it("renders the requested number of rows", () => {
    const { container } = render(<SkeletonRows rows={3} />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("is hidden from assistive tech and respects reduced motion", () => {
    const { container } = render(<SkeletonRows />);
    const list = container.querySelector("ul");
    expect(list).toHaveAttribute("aria-hidden");
    expect(list?.className).toContain("motion-reduce:animate-none");
  });
});
