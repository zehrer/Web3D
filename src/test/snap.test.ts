import { describe, expect, it } from "vitest";
import { snapValue, toRadians } from "../lib/snap";

describe("snap helpers", () => {
  it("snaps when enabled", () => {
    expect(snapValue(23, 5, true)).toBe(25);
  });

  it("passes through values when disabled", () => {
    expect(snapValue(23, 5, false)).toBe(23);
  });

  it("converts degrees to radians", () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI);
  });
});
