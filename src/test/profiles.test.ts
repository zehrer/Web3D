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

  it("creates plexiglass as a thin resizeable panel", () => {
    const profile = getProfileById("plexiglass-3");
    const thickerProfile = getProfileById("plexiglass-10");
    const size = createSizeFromProfile(profile);
    const resized = applyProfileToSize(profile, { x: 1200, y: 800, z: 20 });
    const resizedWithProfileThickness = applyProfileToSize(thickerProfile, { x: 1200, y: 800, z: 3 });

    expect(profile.objectType).toBe("glass");
    expect(size).toEqual({ x: 900, y: 600, z: 3 });
    expect(resized).toEqual({ x: 1200, y: 800, z: 3 });
    expect(createSizeFromProfile(getProfileById("plexiglass-5")).z).toBe(5);
    expect(resizedWithProfileThickness).toEqual({ x: 1200, y: 800, z: 10 });
  });

  it("creates flat shape profiles without thickness", () => {
    const rectangleSize = createSizeFromProfile(getProfileById("shape-rectangle"));
    const circleSize = createSizeFromProfile(getProfileById("shape-circle"));
    const resizedCircle = applyProfileToSize(getProfileById("shape-circle"), { x: 750, y: 30, z: 500 });

    expect(rectangleSize).toEqual({ x: 800, y: 0, z: 500 });
    expect(circleSize).toEqual({ x: 500, y: 0, z: 500 });
    expect(resizedCircle).toEqual({ x: 750, y: 0, z: 750 });
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
