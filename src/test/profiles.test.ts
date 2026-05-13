import { describe, expect, it } from "vitest";
import { applyLockToSize, createSizeFromProfile, extractLockFields, getProfileById, getResizableAxes } from "../lib/profiles";
import { createObjectPart } from "../lib/project";

describe("object profiles", () => {
  it("creates a sheet size from its profile defaults", () => {
    const profile = getProfileById("osb3-18");
    const size = createSizeFromProfile(profile);

    expect(size.x).toBe(1200);
    expect(size.y).toBe(600);
    expect(size.z).toBe(18);
  });

  it("locks a timber's cross-section to its part's recorded width/height", () => {
    const part = createObjectPart(0, { objectType: "timber", profileId: "timber-120x120" });
    const size = applyLockToSize(part, { x: 1800, y: 50, z: 50 });

    expect(size.x).toBe(1800); // length stays free
    expect(size.y).toBe(120); // y clamped to recorded cross-section width
    expect(size.z).toBe(120); // z clamped to recorded cross-section height
  });

  it("supports compact square timber profiles", () => {
    const size = createSizeFromProfile(getProfileById("timber-56x56"));

    expect(size).toEqual({ x: 2000, y: 56, z: 56 });
  });

  it("creates rhombus cladding parts with self-contained cross-section lock", () => {
    const part = createObjectPart(0, { objectType: "cladding", profileId: "rhombus-27x68" });
    const size = applyLockToSize(part, { x: 2400, y: 999, z: 999 });

    expect(part.objectType).toBe("cladding");
    expect(part.crossSectionWidthMm).toBe(68);
    expect(part.crossSectionHeightMm).toBe(27);
    expect(size).toEqual({ x: 2400, y: 68, z: 27 });
  });

  it("locks glass thickness from the part's own field", () => {
    const thin = createObjectPart(0, { objectType: "glass", profileId: "plexiglass-3" });
    const thick = createObjectPart(0, { objectType: "glass", profileId: "plexiglass-10" });

    expect(thin.thicknessMm).toBe(3);
    expect(thick.thicknessMm).toBe(10);
    expect(applyLockToSize(thin, { x: 1200, y: 800, z: 20 })).toEqual({ x: 1200, y: 800, z: 3 });
    expect(applyLockToSize(thick, { x: 1200, y: 800, z: 3 })).toEqual({ x: 1200, y: 800, z: 10 });
  });

  it("flat shapes still force y=0 and circle stays uniform", () => {
    const circle = createObjectPart(0, { objectType: "circle", profileId: "shape-circle" });
    const rect = createObjectPart(0, { objectType: "rectangle", profileId: "shape-rectangle" });

    expect(applyLockToSize(circle, { x: 750, y: 30, z: 500 })).toEqual({ x: 750, y: 0, z: 750 });
    expect(applyLockToSize(rect, { x: 800, y: 30, z: 500 })).toEqual({ x: 800, y: 0, z: 500 });
  });

  it("cube has no lock — size passes through unchanged", () => {
    const cube = createObjectPart(0, { objectType: "cube", profileId: "shape-cube" });
    expect(applyLockToSize(cube, { x: 100, y: 200, z: 300 })).toEqual({ x: 100, y: 200, z: 300 });
  });

  it("extractLockFields gives empty for unlocked types", () => {
    expect(extractLockFields(getProfileById("shape-rectangle"))).toEqual({});
    expect(extractLockFields(getProfileById("shape-cube"))).toEqual({});
    expect(extractLockFields(getProfileById("timber-56x56"))).toEqual({ crossSectionWidthMm: 56, crossSectionHeightMm: 56 });
    expect(extractLockFields(getProfileById("osb3-18"))).toEqual({ thicknessMm: 18 });
  });

  it("limits resize axes by object family", () => {
    expect(getResizableAxes(createObjectPart(0, { objectType: "sheet", profileId: "osb3-18" }))).toEqual(["x", "y"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "timber", profileId: "timber-100x100" }))).toEqual(["x"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "cladding", profileId: "rhombus-19x68" }))).toEqual(["x"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "glass", profileId: "plexiglass-3" }))).toEqual(["x", "y"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "rectangle", profileId: "shape-rectangle" }))).toEqual(["x", "z"]);
    expect(getResizableAxes(createObjectPart(0, { objectType: "circle", profileId: "shape-circle" }))).toEqual(["x"]);
  });
});
