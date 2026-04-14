import { describe, expect, it } from "vitest";
import { applyProfileToSize, createSizeFromProfile, getProfileById, getResizableAxes } from "../lib/profiles";
import { createObjectPart } from "../lib/project";

describe("object profiles", () => {
  it("creates a sheet size from its profile defaults", () => {
    const profile = getProfileById("osb3-18");
    const size = createSizeFromProfile(profile);

    expect(size.x).toBe(1200);
    expect(size.y).toBe(600);
    expect(size.z).toBe(18);
  });

  it("preserves timber length while changing timber profile", () => {
    const size = applyProfileToSize(getProfileById("timber-120x120"), { x: 1800, y: 100, z: 100 });

    expect(size.x).toBe(1800);
    expect(size.y).toBe(120);
    expect(size.z).toBe(120);
  });

  it("limits resize axes by object family", () => {
    expect(getResizableAxes(createObjectPart(0, { objectType: "sheet", profileId: "osb3-18" }))).toEqual(["x", "y"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "timber", profileId: "timber-100x100" }))).toEqual(["x"]);
  });
});
