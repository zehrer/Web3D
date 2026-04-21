import { describe, expect, it } from "vitest";
import { getMaterialUsageSummary } from "../lib/materialSummary";
import { createObjectPart } from "../lib/project";

describe("material summary", () => {
  it("groups linear material by profile and totals object length", () => {
    const first = createObjectPart(0, {
      objectType: "timber",
      profileId: "timber-100x100",
      size: { x: 1200, y: 100, z: 100 },
    });
    const second = createObjectPart(1, {
      objectType: "timber",
      profileId: "timber-100x100",
      size: { x: 800, y: 100, z: 100 },
    });

    const summary = getMaterialUsageSummary([first, second]);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      label: "100 x 100 mm",
      objectType: "timber",
      count: 2,
      kind: "linear",
      totalLengthMm: 2000,
    });
  });

  it("groups panel and shape material by area", () => {
    const sheet = createObjectPart(0, {
      objectType: "sheet",
      profileId: "osb3-18",
      size: { x: 1200, y: 600, z: 18 },
    });
    const rectangle = createObjectPart(1, {
      objectType: "rectangle",
      profileId: "shape-rectangle",
      size: { x: 1000, y: 0, z: 500 },
    });

    const summary = getMaterialUsageSummary([sheet, rectangle]);

    expect(summary.find((item) => item.key === "sheet:osb3-18")).toMatchObject({
      kind: "area",
      totalAreaMm2: 720000,
    });
    expect(summary.find((item) => item.key === "rectangle:shape-rectangle")).toMatchObject({
      kind: "area",
      totalAreaMm2: 500000,
    });
  });
});
