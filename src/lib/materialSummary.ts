import { getObjectTypeLabel } from "./profiles";
import type { MaterialNode, ObjectType, PartNode } from "../types/model";

export type MaterialUsageKind = "linear" | "area";

export type MaterialUsageItem = {
  key: string;
  label: string;
  objectType: ObjectType;
  objectTypeLabel: string;
  count: number;
  kind: MaterialUsageKind;
  totalLengthMm: number;
  totalAreaMm2: number;
  partIds: string[];
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

  return [...usageByKey.values()].sort((a, b) => {
    const typeOrder = OBJECT_TYPE_SORT_ORDER[a.objectType] - OBJECT_TYPE_SORT_ORDER[b.objectType];
    return typeOrder || a.label.localeCompare(b.label);
  });
}
