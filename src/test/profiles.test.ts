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

  it("supports compact square timber profiles", () => {
    const size = createSizeFromProfile(getProfileById("timber-56x56"));

    expect(size).toEqual({ x: 2000, y: 56, z: 56 });
  });

  it("creates rhombus cladding profiles with fixed cross-section and editable length", () => {
    const profile = getProfileById("rhombus-19x68");
    const size = createSizeFromProfile(profile);
    const resized = applyProfileToSize(getProfileById("rhombus-27x68"), { ...size, x: 2400 });

    expect(profile.objectType).toBe("cladding");
    expect(size).toEqual({ x: 2000, y: 68, z: 19 });
    expect(resized).toEqual({ x: 2400, y: 68, z: 27 });
  });

  it("limits resize axes by object family", () => {
    expect(getResizableAxes(createObjectPart(0, { objectType: "sheet", profileId: "osb3-18" }))).toEqual(["x", "y"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "timber", profileId: "timber-100x100" }))).toEqual(["x"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "cladding", profileId: "rhombus-19x68" }))).toEqual(["x"]);
  });
});
