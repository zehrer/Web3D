import type { AxisLocks, MaterialGroupNode, MaterialLibraryDocument, MaterialNode, ProjectDocument, Vector3Like } from "../types/model";

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 10)}`;
}

function sameVector(a: Vector3Like, b: Vector3Like): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function normalizeLocks(value: AxisLocks | undefined): AxisLocks {
  return {
    ...(value?.x ? { x: true } : {}),
    ...(value?.y ? { y: true } : {}),
    ...(value?.z ? { z: true } : {}),
  };
}

function sameLocks(a: AxisLocks | undefined, b: AxisLocks | undefined): boolean {
  const left = normalizeLocks(a);
  const right = normalizeLocks(b);
  return Boolean(left.x) === Boolean(right.x) && Boolean(left.y) === Boolean(right.y) && Boolean(left.z) === Boolean(right.z);
}

function sameMaterialDefinition(a: MaterialNode, b: MaterialNode): boolean {
  return (
    a.name === b.name &&
    a.objectType === b.objectType &&
    a.color === b.color &&
    sameVector(a.defaultSize, b.defaultSize) &&
    sameLocks(a.lockedAxes, b.lockedAxes)
  );
}

function findMatchingMaterial(materials: MaterialNode[], material: MaterialNode): MaterialNode | undefined {
  return materials.find((candidate) => candidate.id === material.id && sameMaterialDefinition(candidate, material))
    ?? materials.find((candidate) => sameMaterialDefinition(candidate, material));
}

function findOrCreateGroup(
  library: MaterialLibraryDocument,
  sourceGroup: MaterialGroupNode | null,
  sourceGroups: MaterialGroupNode[],
  groupIdMap: Map<string, string>,
): string | null {
  if (!sourceGroup) {
    return null;
  }

  const mapped = groupIdMap.get(sourceGroup.id);
  if (mapped) {
    return mapped;
  }

  const parentGroupId = sourceGroup.parentGroupId
    ? findOrCreateGroup(
        library,
        sourceGroups.find((group) => group.id === sourceGroup.parentGroupId) ?? null,
        sourceGroups,
        groupIdMap,
      )
    : null;
  const existing = library.materialGroups.find(
    (group) => group.name === sourceGroup.name && group.parentGroupId === parentGroupId,
  );
  if (existing) {
    groupIdMap.set(sourceGroup.id, existing.id);
    return existing.id;
  }

  const groupId = library.materialGroups.some((group) => group.id === sourceGroup.id) ? randomId() : sourceGroup.id;
  library.materialGroups.push({
    ...sourceGroup,
    id: groupId,
    parentGroupId,
  });
  groupIdMap.set(sourceGroup.id, groupId);
  return groupId;
}

export function buildPortableProject(project: ProjectDocument, library: MaterialLibraryDocument): ProjectDocument {
  const usedMaterialIds = new Set(project.parts.map((part) => part.materialId).filter((id): id is string => Boolean(id)));
  const materials = library.materials
    .filter((material) => usedMaterialIds.has(material.id))
    .map((material) => ({
      ...material,
      defaultSize: { ...material.defaultSize },
      lockedAxes: { ...material.lockedAxes },
    }));
  const requiredGroupIds = new Set<string>();
  materials.forEach((material) => {
    let group = material.groupId ? library.materialGroups.find((item) => item.id === material.groupId) : undefined;
    while (group) {
      requiredGroupIds.add(group.id);
      group = group.parentGroupId ? library.materialGroups.find((item) => item.id === group?.parentGroupId) : undefined;
    }
  });

  return {
    ...project,
    materialGroups: library.materialGroups.filter((group) => requiredGroupIds.has(group.id)),
    materials,
  };
}

export function reconcileProjectMaterials(
  project: ProjectDocument,
  library: MaterialLibraryDocument,
): { project: ProjectDocument; library: MaterialLibraryDocument } {
  if (!project.materials.length) {
    return { project, library };
  }

  const nextLibrary: MaterialLibraryDocument = {
    materialGroups: library.materialGroups.map((group) => ({ ...group })),
    materials: library.materials.map((material) => ({
      ...material,
      defaultSize: { ...material.defaultSize },
      lockedAxes: { ...material.lockedAxes },
    })),
  };
  const groupIdMap = new Map<string, string>();
  const materialIdMap = new Map<string, string>();

  for (const material of project.materials) {
    const matching = findMatchingMaterial(nextLibrary.materials, material);
    if (matching) {
      materialIdMap.set(material.id, matching.id);
      continue;
    }

    const sourceGroup = material.groupId
      ? project.materialGroups.find((group) => group.id === material.groupId) ?? null
      : null;
    const groupId = findOrCreateGroup(nextLibrary, sourceGroup, project.materialGroups, groupIdMap);
    const materialId = nextLibrary.materials.some((candidate) => candidate.id === material.id) ? randomId() : material.id;
    nextLibrary.materials.push({
      ...material,
      id: materialId,
      groupId,
      defaultSize: { ...material.defaultSize },
      lockedAxes: { ...material.lockedAxes },
      sourceLibraryMaterialId: undefined,
    });
    materialIdMap.set(material.id, materialId);
  }

  return {
    library: nextLibrary,
    project: {
      ...project,
      materialGroups: [],
      materials: [],
      parts: project.parts.map((part) => ({
        ...part,
        materialId: part.materialId && materialIdMap.has(part.materialId) ? materialIdMap.get(part.materialId)! : part.materialId,
      })),
    },
  };
}
