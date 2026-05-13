import { describe, expect, it } from "vitest";
import { getMaterialUsageSummary } from "../lib/materialSummary";
import { createObjectPart } from "../lib/project";
import type { MaterialNode } from "../types/model";

const TIMBER_MATERIAL: MaterialNode = {
  id: "mat-timber-100",
  name: "Timber 100×100",
  groupId: null,
  objectType: "timber",
  profileId: "timber-100x100",
  color: "#a77b4e",
};

const SHEET_MATERIAL: MaterialNode = {
  id: "mat-osb-18",
  name: "OSB/3 18 mm",
  groupId: null,
  objectType: "sheet",
  profileId: "osb3-18",
  color: "#caa165",
};

describe("material summary", () => {
  it("groups parts that share a materialId and totals their length", () => {
    const first = { ...createObjectPart(0, { objectType: "timber", profileId: "timber-100x100", size: { x: 1200, y: 100, z: 100 } }), materialId: TIMBER_MATERIAL.id };
    const second = { ...createObjectPart(1, { objectType: "timber", profileId: "timber-100x100", size: { x: 800, y: 100, z: 100 } }), materialId: TIMBER_MATERIAL.id };

    const summary = getMaterialUsageSummary([first, second], [TIMBER_MATERIAL]);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      key: `mat:${TIMBER_MATERIAL.id}`,
      label: "Timber 100×100",
      objectType: "timber",
      count: 2,
      kind: "linear",
      totalLengthMm: 2000,
    });
    expect(summary[0].partIds).toEqual([first.id, second.id]);
  });

  it("uses the material's name as the label, not the profile label", () => {
    const renamed: MaterialNode = { ...TIMBER_MATERIAL, name: "Custom Beam Stock" };
    const part = { ...createObjectPart(0, { objectType: "timber", profileId: "timber-100x100", size: { x: 1000, y: 100, z: 100 } }), materialId: renamed.id };

    const summary = getMaterialUsageSummary([part], [renamed]);

    expect(summary[0].label).toBe("Custom Beam Stock");
  });

  it("groups orphan parts (no materialId) by their lock dimensions", () => {
    const a = { ...createObjectPart(0, { objectType: "timber", profileId: "timber-100x100", size: { x: 500, y: 100, z: 100 } }), materialId: null };
    const b = { ...createObjectPart(1, { objectType: "timber", profileId: "timber-100x100", size: { x: 1500, y: 100, z: 100 } }), materialId: null };
    const c = { ...createObjectPart(2, { objectType: "timber", profileId: "timber-60x80", size: { x: 1000, y: 60, z: 80 } }), materialId: null };

    const summary = getMaterialUsageSummary([a, b, c], []);

    expect(summary).toHaveLength(2);
    const square = summary.find((item) => item.key === "dim:timber:100x100");
    const rectangular = summary.find((item) => item.key === "dim:timber:60x80");
    expect(square).toMatchObject({ label: "Timber 100 × 100 mm", count: 2, totalLengthMm: 2000 });
    expect(rectangular).toMatchObject({ label: "Timber 60 × 80 mm", count: 1, totalLengthMm: 1000 });
  });

  it("falls back to a dimensions-based label when materialId points to a deleted material", () => {
    const part = { ...createObjectPart(0, { objectType: "sheet", profileId: "osb3-18", size: { x: 1200, y: 600, z: 18 } }), materialId: "deleted-id" };

    const summary = getMaterialUsageSummary([part], []);

    expect(summary[0].label).toBe("Sheet 18 mm");
    expect(summary[0].key).toBe("dim:sheet:t18");
  });

  it("computes panel and shape area as before", () => {
    const sheet = { ...createObjectPart(0, { objectType: "sheet", profileId: "osb3-18", size: { x: 1200, y: 600, z: 18 } }), materialId: SHEET_MATERIAL.id };
    const rectangle = { ...createObjectPart(1, { objectType: "rectangle", profileId: "shape-rectangle", size: { x: 1000, y: 0, z: 500 } }), materialId: null };

    const summary = getMaterialUsageSummary([sheet, rectangle], [SHEET_MATERIAL]);

    expect(summary.find((item) => item.key === `mat:${SHEET_MATERIAL.id}`)).toMatchObject({
      kind: "area",
      totalAreaMm2: 720000,
    });
    expect(summary.find((item) => item.key === "dim:rectangle")).toMatchObject({
      label: "Rectangle",
      kind: "area",
      totalAreaMm2: 500000,
    });
  });
});
