import { getDefaultUnitPreference } from "./locale";
import {
  CLADDING_PROFILES,
  GLASS_PROFILES,
  OBJECT_TYPE_LABELS,
  SHEET_PROFILES,
  TIMBER_PROFILES,
  createObjectName,
  createSizeFromProfile,
  extractLockFields,
  getDefaultProfileId,
  getProfileById,
} from "./profiles";
import gardenShedDemo from "../data/gardenShedDemo.json";
import type {
  GroupNode,
  MaterialGroupNode,
  MaterialNode,
  MeasurementNode,
  ObjectProfileId,
  ObjectType,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  Vector3Like,
} from "../types/model";

export const PROJECT_SCHEMA_VERSION = 9;
export const DEFAULT_GRID_SETTINGS = { size: 6000, originX: 0, originZ: 0 };
export const DEFAULT_WORKSPACE_FOCUS_XZ = 900;
export const DEFAULT_CAMERA_HEIGHT = 160;

// Demo JSON predates the v9 schema and still carries profileId on its parts.
// We narrow it locally to a legacy shape so createDemoParts can read it.
type DemoSourcePart = PartNode & { profileId: ObjectProfileId };
type LegacyDemoProject = Omit<ProjectDocument, "parts"> & { parts: DemoSourcePart[] };
const gardenShedDemoProject = gardenShedDemo as unknown as LegacyDemoProject;

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeVector3(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

export function cloneProject(project: ProjectDocument): ProjectDocument {
  return JSON.parse(JSON.stringify(project)) as ProjectDocument;
}

export function createObjectPart(
  index: number,
  options?: {
    objectType?: ObjectType;
    profileId?: ObjectProfileId;
    size?: Vector3Like;
    position?: Vector3Like;
    materialId?: string | null;
  },
): PartNode {
  const objectType = options?.objectType ?? "sheet";
  const profileId = options?.profileId ?? getDefaultProfileId(objectType);
  const profile = getProfileById(profileId);

  return {
    id: randomId(),
    name: createObjectName(objectType, index),
    objectType,
    groupId: null,
    materialId: options?.materialId ?? null,
    size: options?.size ?? createSizeFromProfile(profile),
    position: options?.position ?? makeVector3(0, 0, 0),
    rotation: makeVector3(0, 0, 0),
    color: profile.color,
    ...extractLockFields(profile),
  };
}

export function createMeasurementNode(index: number, start: Vector3Like, end: Vector3Like): MeasurementNode {
  return {
    id: randomId(),
    name: `Measure ${index + 1}`,
    groupId: null,
    start,
    end,
    color: "#276f9f",
  };
}

function cloneVector(value: Vector3Like): Vector3Like {
  return { x: value.x, y: value.y, z: value.z };
}

function createDemoGroups(sourceGroups: GroupNode[]) {
  const groupIdMap = new Map<string, string>();
  sourceGroups.forEach((group) => groupIdMap.set(group.id, randomId()));

  const groups = sourceGroups.map((group) => ({
    ...group,
    id: groupIdMap.get(group.id)!,
    parentGroupId: group.parentGroupId ? (groupIdMap.get(group.parentGroupId) ?? null) : null,
  }));

  return { groups, groupIdMap };
}

type InitialMaterials = {
  materialGroups: MaterialGroupNode[];
  materials: MaterialNode[];
  profileToMaterialId: Map<string, string>;
};

export function createInitialMaterials(): InitialMaterials {
  const materialGroups: MaterialGroupNode[] = [];
  const materials: MaterialNode[] = [];
  const profileToMaterialId = new Map<string, string>();
  const objectTypeGroupId = new Map<ObjectType, string>();

  const ORDER: ObjectType[] = ["timber", "sheet", "cladding", "glass"];
  const ALL_PROFILES = [...TIMBER_PROFILES, ...SHEET_PROFILES, ...CLADDING_PROFILES, ...GLASS_PROFILES];

  for (const objectType of ORDER) {
    const groupId = randomId();
    objectTypeGroupId.set(objectType, groupId);
    materialGroups.push({ id: groupId, name: OBJECT_TYPE_LABELS[objectType], parentGroupId: null });
  }

  for (const profile of ALL_PROFILES) {
    const materialId = randomId();
    materials.push({
      id: materialId,
      name: profile.label,
      groupId: objectTypeGroupId.get(profile.objectType) ?? null,
      objectType: profile.objectType,
      color: profile.color,
      defaultSize: createSizeFromProfile(profile),
      ...extractLockFields(profile),
    });
    profileToMaterialId.set(profile.id, materialId);
  }

  return { materialGroups, materials, profileToMaterialId };
}

function createDemoParts(sourceParts: DemoSourcePart[], groupIdMap: Map<string, string>, profileToMaterialId: Map<string, string>): PartNode[] {
  return sourceParts.map((sourcePart) => {
    const { profileId, ...part } = sourcePart;
    return {
      ...part,
      id: randomId(),
      groupId: part.groupId ? (groupIdMap.get(part.groupId) ?? null) : null,
      materialId: profileToMaterialId.get(profileId) ?? null,
      size: cloneVector(part.size),
      position: cloneVector(part.position),
      rotation: cloneVector(part.rotation),
      ...extractLockFields(getProfileById(profileId)),
    };
  });
}

function createDemoMeasurements(sourceMeasurements: MeasurementNode[], groupIdMap: Map<string, string>): MeasurementNode[] {
  return sourceMeasurements.map((measurement) => ({
    ...measurement,
    id: randomId(),
    groupId: measurement.groupId ? (groupIdMap.get(measurement.groupId) ?? null) : null,
    start: cloneVector(measurement.start),
    end: cloneVector(measurement.end),
  }));
}

export function createProject(name?: string): ProjectDocument {
  const now = new Date().toISOString();
  const { materialGroups, materials } = createInitialMaterials();

  return {
    id: randomId(),
    name: name ?? "New Project",
    version: PROJECT_SCHEMA_VERSION,
    unitPreference: getDefaultUnitPreference(),
    snapSettings: {
      ...gardenShedDemoProject.snapSettings,
    },
    gridSettings: { ...DEFAULT_GRID_SETTINGS },
    cameraState: {
      position: cloneVector(gardenShedDemoProject.cameraState.position),
      target: cloneVector(gardenShedDemoProject.cameraState.target),
    },
    groups: [],
    parts: [],
    measurements: [],
    materialGroups,
    materials,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoProject(): ProjectDocument {
  const now = new Date().toISOString();
  const { groups, groupIdMap } = createDemoGroups(gardenShedDemoProject.groups);
  const { materialGroups, materials, profileToMaterialId } = createInitialMaterials();
  const parts = createDemoParts(gardenShedDemoProject.parts, groupIdMap, profileToMaterialId);
  const measurements = createDemoMeasurements(gardenShedDemoProject.measurements, groupIdMap);

  return {
    id: randomId(),
    name: gardenShedDemoProject.name,
    version: PROJECT_SCHEMA_VERSION,
    unitPreference: getDefaultUnitPreference(),
    snapSettings: {
      ...gardenShedDemoProject.snapSettings,
    },
    gridSettings: { ...DEFAULT_GRID_SETTINGS },
    cameraState: {
      position: cloneVector(gardenShedDemoProject.cameraState.position),
      target: cloneVector(gardenShedDemoProject.cameraState.target),
    },
    groups,
    parts,
    measurements,
    materialGroups,
    materials,
    createdAt: now,
    updatedAt: now,
  };
}

export function touchProject(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeProject(project: ProjectDocument): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    partCount: project.parts.length,
  };
}
