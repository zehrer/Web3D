import { Euler, Vector3 } from "three";
import { applyMaterialToPart } from "./partMaterial";
import type { MaterialNode, PartNode, ProjectDocument } from "../types/model";

const EPSILON = 1e-6;

type OrientedBox = {
  center: Vector3;
  axes: [Vector3, Vector3, Vector3];
  halfSizes: [number, number, number];
};

function hasVolume(part: PartNode): boolean {
  return part.size.x > EPSILON && part.size.y > EPSILON && part.size.z > EPSILON;
}

function getPartBox(part: PartNode): OrientedBox | null {
  if (part.hidden || !hasVolume(part)) {
    return null;
  }

  const rotation = new Euler(part.rotation.x, part.rotation.y, part.rotation.z);
  const axes: [Vector3, Vector3, Vector3] = [
    new Vector3(1, 0, 0).applyEuler(rotation).normalize(),
    new Vector3(0, 1, 0).applyEuler(rotation).normalize(),
    new Vector3(0, 0, 1).applyEuler(rotation).normalize(),
  ];
  const halfSizes: [number, number, number] = [part.size.x / 2, part.size.y / 2, part.size.z / 2];
  const center = new Vector3(part.position.x, part.position.y, part.position.z)
    .addScaledVector(axes[0], halfSizes[0])
    .addScaledVector(axes[1], halfSizes[1])
    .addScaledVector(axes[2], halfSizes[2]);

  return { center, axes, halfSizes };
}

function projectionRadius(box: OrientedBox, axis: Vector3): number {
  return (
    box.halfSizes[0] * Math.abs(axis.dot(box.axes[0])) +
    box.halfSizes[1] * Math.abs(axis.dot(box.axes[1])) +
    box.halfSizes[2] * Math.abs(axis.dot(box.axes[2]))
  );
}

function overlapsOnAxis(a: OrientedBox, b: OrientedBox, axis: Vector3): boolean {
  const distance = Math.abs(new Vector3().subVectors(b.center, a.center).dot(axis));
  const radiusSum = projectionRadius(a, axis) + projectionRadius(b, axis);
  return distance < radiusSum - EPSILON;
}

function boxesOverlap(a: OrientedBox, b: OrientedBox): boolean {
  const axes: Vector3[] = [...a.axes, ...b.axes];

  for (const aAxis of a.axes) {
    for (const bAxis of b.axes) {
      const cross = new Vector3().crossVectors(aAxis, bAxis);
      if (cross.lengthSq() > EPSILON) {
        axes.push(cross.normalize());
      }
    }
  }

  return axes.every((axis) => overlapsOnAxis(a, b, axis));
}

export function partsOverlap(a: PartNode, b: PartNode): boolean {
  const aBox = getPartBox(a);
  const bBox = getPartBox(b);
  return Boolean(aBox && bBox && boxesOverlap(aBox, bBox));
}

export function findOverlappingParts(candidate: PartNode, parts: PartNode[]): PartNode[] {
  return parts.filter((part) => part.id !== candidate.id && partsOverlap(candidate, part));
}

export function getPartMaterialChangeOverlaps(
  project: ProjectDocument,
  materials: MaterialNode[],
  partId: string,
  materialId: string,
): { candidate: PartNode; material: MaterialNode; overlaps: PartNode[] } | null {
  const part = project.parts.find((item) => item.id === partId);
  const material = materials.find((item) => item.id === materialId);
  if (!part || !material || material.objectType !== part.objectType) {
    return null;
  }

  const candidate = applyMaterialToPart(part, material);
  return {
    candidate,
    material,
    overlaps: findOverlappingParts(candidate, project.parts),
  };
}
