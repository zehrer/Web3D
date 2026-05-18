import { applyLockToSize } from "./profiles";
import { clampLength } from "./units";
import type { AxisLocks, MaterialNode, PartNode, Vector3Like } from "../types/model";

function normalizePartSize(part: PartNode, size: Vector3Like): Vector3Like {
  const clamped = applyLockToSize(part, {
    x: clampLength(size.x),
    y: clampLength(size.y),
    z: clampLength(size.z),
  });

  return {
    x: clampLength(clamped.x),
    y: part.objectType === "rectangle" || part.objectType === "circle" ? 0 : clampLength(clamped.y),
    z: clampLength(clamped.z),
  };
}

export function legacyLockFieldsFromSize(size: Vector3Like, lockedAxes?: AxisLocks): Pick<PartNode, "crossSectionWidthMm" | "crossSectionHeightMm" | "thicknessMm"> {
  if (lockedAxes?.y && lockedAxes.z) {
    return {
      crossSectionWidthMm: size.y,
      crossSectionHeightMm: size.z,
      thicknessMm: undefined,
    };
  }

  if (lockedAxes?.z) {
    return {
      crossSectionWidthMm: undefined,
      crossSectionHeightMm: undefined,
      thicknessMm: size.z,
    };
  }

  return {
    crossSectionWidthMm: undefined,
    crossSectionHeightMm: undefined,
    thicknessMm: undefined,
  };
}

export function applyMaterialToPart(part: PartNode, material: MaterialNode): PartNode {
  if (material.objectType !== part.objectType) {
    return part;
  }

  const nextSize: Vector3Like = { ...part.size };
  (["x", "y", "z"] as Array<keyof Vector3Like>).forEach((axis) => {
    if (material.lockedAxes?.[axis]) {
      nextSize[axis] = material.defaultSize[axis];
    }
  });

  const nextPart: PartNode = {
    ...part,
    materialId: material.id,
    color: material.color,
    size: nextSize,
    lockedAxes: { ...material.lockedAxes },
    ...legacyLockFieldsFromSize(material.defaultSize, material.lockedAxes),
  };

  return { ...nextPart, size: normalizePartSize(nextPart, nextSize) };
}
