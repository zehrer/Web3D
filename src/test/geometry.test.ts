import { describe, expect, it } from "vitest";
import { applyResizeFromHandle } from "../lib/geometry";
import { createObjectPart, makeVector3 } from "../lib/project";

describe("resize handle geometry", () => {
  it("grows the positive handle while keeping the anchor fixed", () => {
    const part = createObjectPart(0, {
      size: makeVector3(600, 300, 18),
      position: makeVector3(0, 0, 0),
    });

    const next = applyResizeFromHandle(part, "x", 1, 20, 5, true);

    expect(next.size.x).toBe(640);
    expect(next.position.x).toBe(0);
  });

  it("moves the anchor when resizing from the negative handle", () => {
    const part = createObjectPart(0, {
      size: makeVector3(600, 300, 18),
      position: makeVector3(0, 0, 0),
    });

    const next = applyResizeFromHandle(part, "x", -1, 20, 5, true);

    expect(next.size.x).toBe(560);
    expect(next.position.x).toBe(40);
  });
});
