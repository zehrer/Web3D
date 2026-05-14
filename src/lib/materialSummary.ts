import { getObjectTypeLabel } from "./profiles";
import type { MaterialNode, ObjectType, PartNode } from "../types/model";

export type MaterialUsageKind = "linear" | "area";

export type CutPlanCut = {
  partId: string;
  partName: string;
  lengthMm: number;
};

export type CutPlanStock = {
  index: number;
  cuts: CutPlanCut[];
  usedLengthMm: number;
  leftoverLengthMm: number;
};

export type LinearCutPlan = {
  rawStockLengthMm: number;
  kerfMm: number;
  stock: CutPlanStock[];
  stockCount: number;
  totalWasteMm: number;
  oversizePartIds: string[];
};

export type MaterialUsageItem = {
  key: string;
  materialId: string | null;
  label: string;
  objectType: ObjectType;
  objectTypeLabel: string;
  count: number;
  kind: MaterialUsageKind;
  totalLengthMm: number;
  totalAreaMm2: number;
  partIds: string[];
  cutPlan?: LinearCutPlan;
};

const OBJECT_TYPE_SORT_ORDER: Record<ObjectType, number> = {
  timber: 0,
  cladding: 1,
  sheet: 2,
  glass: 3,
  rectangle: 4,
  circle: 5,
  cube: 6,
};

function getUsageKind(part: PartNode): MaterialUsageKind {
  return part.objectType === "timber" || part.objectType === "cladding" ? "linear" : "area";
}

function getPartAreaMm2(part: PartNode): number {
  if (part.objectType === "circle") {
    return Math.PI * (part.size.x / 2) ** 2;
  }

  if (part.objectType === "rectangle") {
    return part.size.x * part.size.z;
  }

  return part.size.x * part.size.y;
}

/**
 * Label for a part that has no (or a missing) materialId — derived from the
 * part's own type and lock fields. Used as the cut-list fallback so the
 * material library isn't load-bearing for the summary.
 */
function deriveOrphanLabel(part: PartNode): string {
  const typeLabel = getObjectTypeLabel(part.objectType);
  if (part.crossSectionWidthMm !== undefined && part.crossSectionHeightMm !== undefined) {
    return `${typeLabel} ${part.crossSectionWidthMm} × ${part.crossSectionHeightMm} mm`;
  }
  if (part.thicknessMm !== undefined) {
    return `${typeLabel} ${part.thicknessMm} mm`;
  }
  return typeLabel;
}

function deriveOrphanKey(part: PartNode): string {
  if (part.crossSectionWidthMm !== undefined && part.crossSectionHeightMm !== undefined) {
    return `dim:${part.objectType}:${part.crossSectionWidthMm}x${part.crossSectionHeightMm}`;
  }
  if (part.thicknessMm !== undefined) {
    return `dim:${part.objectType}:t${part.thicknessMm}`;
  }
  return `dim:${part.objectType}`;
}

export function getMaterialUsageSummary(
  parts: PartNode[],
  materials: MaterialNode[],
  kerfMm = 0,
): MaterialUsageItem[] {
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const usageByKey = new Map<string, MaterialUsageItem>();

  for (const part of parts) {
    const material = part.materialId ? materialById.get(part.materialId) : undefined;
    const key = material ? `mat:${material.id}` : deriveOrphanKey(part);
    const label = material ? material.name : deriveOrphanLabel(part);
    const kind = getUsageKind(part);

    const current = usageByKey.get(key) ?? {
      key,
      materialId: material?.id ?? null,
      label,
      objectType: part.objectType,
      objectTypeLabel: getObjectTypeLabel(part.objectType),
      count: 0,
      kind,
      totalLengthMm: 0,
      totalAreaMm2: 0,
      partIds: [],
    };

    current.count += 1;
    current.partIds.push(part.id);
    if (kind === "linear") {
      current.totalLengthMm += part.size.x;
    } else {
      current.totalAreaMm2 += getPartAreaMm2(part);
    }

    usageByKey.set(key, current);
  }

  const byPartId = new Map(parts.map((part) => [part.id, part]));
  const normalizedKerfMm = Math.max(0, Number.isFinite(kerfMm) ? kerfMm : 0);

  usageByKey.forEach((item) => {
    if (item.kind !== "linear" || !item.key.startsWith("mat:")) {
      return;
    }
    const material = materialById.get(item.key.slice(4));
    if (!material || material.defaultSize.x <= 0) {
      return;
    }

    item.cutPlan = createLinearCutPlan(
      item.partIds
        .map((partId) => byPartId.get(partId))
        .filter((part): part is PartNode => Boolean(part)),
      material.defaultSize.x,
      normalizedKerfMm,
    );
  });

  return [...usageByKey.values()].sort((a, b) => {
    const typeOrder = OBJECT_TYPE_SORT_ORDER[a.objectType] - OBJECT_TYPE_SORT_ORDER[b.objectType];
    return typeOrder || a.label.localeCompare(b.label);
  });
}

function createLinearCutPlan(parts: PartNode[], rawStockLengthMm: number, kerfMm: number): LinearCutPlan {
  const oversizePartIds: string[] = [];
  const cuts = parts
    .map((part): CutPlanCut => ({ partId: part.id, partName: part.name, lengthMm: part.size.x }))
    .filter((cut) => {
      if (cut.lengthMm > rawStockLengthMm) {
        oversizePartIds.push(cut.partId);
        return false;
      }
      return true;
    })
    .sort((left, right) => right.lengthMm - left.lengthMm || left.partName.localeCompare(right.partName) || left.partId.localeCompare(right.partId));

  const stock: CutPlanStock[] = [];

  cuts.forEach((cut) => {
    const target = stock.find((candidate) => candidate.usedLengthMm + (candidate.cuts.length > 0 ? kerfMm : 0) + cut.lengthMm <= rawStockLengthMm);
    if (target) {
      target.usedLengthMm += (target.cuts.length > 0 ? kerfMm : 0) + cut.lengthMm;
      target.leftoverLengthMm = rawStockLengthMm - target.usedLengthMm;
      target.cuts.push(cut);
    } else {
      stock.push({
        index: stock.length + 1,
        cuts: [cut],
        usedLengthMm: cut.lengthMm,
        leftoverLengthMm: rawStockLengthMm - cut.lengthMm,
      });
    }
  });

  return {
    rawStockLengthMm,
    kerfMm,
    stock,
    stockCount: stock.length,
    totalWasteMm: stock.reduce((sum, item) => sum + item.leftoverLengthMm, 0),
    oversizePartIds,
  };
}
