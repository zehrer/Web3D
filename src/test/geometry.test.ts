import { describe, expect, it } from "vitest";
import { applyResizeFromHandle } from "../lib/geometry";
import { createBoxPart, makeVector3 } from "../lib/project";

describe("resize handle geometry", () => {
  it("grows the selected axis and offsets the part center", () => {
    const part = createBoxPart(0, {
      size: makeVector3(600, 300, 18),
      position: makeVector3(0, 150, 0),
    });

    const next = applyResizeFromHandle(part, "x", 1, 20, 5, true);

    expect(next.size.x).toBe(640);
    expect(next.position.x).toBe(20);
  });

  it("shrinks against the negative handle", () => {
    const part = createBoxPart(0, {
      size: makeVector3(600, 300, 18),
      position: makeVector3(0, 150, 0),
    });

    const next = applyResizeFromHandle(part, "x", -1, 20, 5, true);

    expect(next.size.x).toBe(560);
    expect(next.position.x).toBe(20);
  });
});
