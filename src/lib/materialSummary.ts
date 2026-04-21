import { getObjectTypeLabel, getProfileById } from "./profiles";
import type { ObjectType, PartNode } from "../types/model";

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
};

const OBJECT_TYPE_SORT_ORDER: Record<ObjectType, number> = {
  timber: 0,
  cladding: 1,
  sheet: 2,
  glass: 3,
  rectangle: 4,
  circle: 5,
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

function getUsageLabel(part: PartNode): string {
  return getProfileById(part.profileId).label;
}

export function getMaterialUsageSummary(parts: PartNode[]): MaterialUsageItem[] {
  const usageByKey = new Map<string, MaterialUsageItem>();

  parts.forEach((part) => {
    const kind = getUsageKind(part);
    const key = `${part.objectType}:${part.profileId}`;
    const current = usageByKey.get(key) ?? {
      key,
      label: getUsageLabel(part),
      objectType: part.objectType,
      objectTypeLabel: getObjectTypeLabel(part.objectType),
      count: 0,
      kind,
      totalLengthMm: 0,
      totalAreaMm2: 0,
    };

    current.count += 1;
    if (kind === "linear") {
      current.totalLengthMm += part.size.x;
    } else {
      current.totalAreaMm2 += getPartAreaMm2(part);
    }

    usageByKey.set(key, current);
  });

  return [...usageByKey.values()].sort((a, b) => {
    const typeOrder = OBJECT_TYPE_SORT_ORDER[a.objectType] - OBJECT_TYPE_SORT_ORDER[b.objectType];
    return typeOrder || a.label.localeCompare(b.label);
  });
}
