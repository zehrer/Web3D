import { getDefaultUnitPreference } from "./locale";
import { createObjectName, createSizeFromProfile, getDefaultProfileId, getProfileById } from "./profiles";
import type {
  GroupNode,
  ObjectProfileId,
  ObjectType,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  Vector3Like,
} from "../types/model";

export const PROJECT_SCHEMA_VERSION = 3;
export const DEFAULT_WORKSPACE_FOCUS_XZ = 900;
export const DEFAULT_CAMERA_HEIGHT = 160;

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
  },
): PartNode {
  const objectType = options?.objectType ?? "sheet";
  const profileId = options?.profileId ?? getDefaultProfileId(objectType);
  const profile = getProfileById(profileId);

  return {
    id: randomId(),
    name: createObjectName(objectType, index),
    objectType,
    profileId,
    groupId: null,
    size: options?.size ?? createSizeFromProfile(profile),
    position: options?.position ?? makeVector3(0, 0, 0),
    rotation: makeVector3(0, 0, 0),
    color: profile.color,
  };
}

function createTimberMember(
  name: string,
  start: Vector3Like,
  direction: "x" | "y" | "z",
  lengthMm: number,
  profileId: ObjectProfileId = "timber-100x100",
): PartNode {
  const profile = getProfileById(profileId);
  if (profile.objectType !== "timber") {
    throw new Error(`Timber member requires a timber profile, received ${profileId}`);
  }

  const size = {
    x: lengthMm,
    y: profile.widthMm,
    z: profile.heightMm,
  };

  if (direction === "x") {
    return {
      ...createObjectPart(0, {
        objectType: "timber",
        profileId,
        size,
        position: start,
      }),
      name,
    };
  }

  if (direction === "y") {
    return {
      ...createObjectPart(0, {
        objectType: "timber",
        profileId,
        size,
        position: makeVector3(start.x + profile.widthMm, start.y, start.z),
      }),
      name,
      rotation: makeVector3(0, 0, Math.PI / 2),
    };
  }

  return {
    ...createObjectPart(0, {
      objectType: "timber",
      profileId,
      size,
      position: makeVector3(start.x + profile.heightMm, start.y, start.z),
    }),
    name,
    rotation: makeVector3(0, Math.PI / 2, 0),
  };
}

function createSheetPanel(
  name: string,
  start: Vector3Like,
  widthMm: number,
  heightMm: number,
  orientation: "xy" | "zy",
  profileId: ObjectProfileId = "osb3-18",
): PartNode {
  const profile = getProfileById(profileId);
  if (profile.objectType !== "sheet") {
    throw new Error(`Sheet panel requires a sheet profile, received ${profileId}`);
  }

  const size = {
    x: widthMm,
    y: heightMm,
    z: profile.thicknessMm,
  };

  if (orientation === "xy") {
    return {
      ...createObjectPart(0, {
        objectType: "sheet",
        profileId,
        size,
        position: start,
      }),
      name,
    };
  }

  return {
    ...createObjectPart(0, {
      objectType: "sheet",
      profileId,
      size,
      position: makeVector3(start.x + profile.thicknessMm, start.y, start.z),
    }),
    name,
    rotation: makeVector3(0, Math.PI / 2, 0),
  };
}

export function createGardenShedDemoParts(): PartNode[] {
  const floorFrameGroupId = randomId();
  const postsGroupId = randomId();
  const roofFrameGroupId = randomId();
  const panelsGroupId = randomId();
  const parts = [
    { ...createTimberMember("Front Sill", makeVector3(0, 0, 0), "x", 1800), groupId: floorFrameGroupId },
    { ...createTimberMember("Back Sill", makeVector3(0, 0, 1100), "x", 1800), groupId: floorFrameGroupId },
    { ...createTimberMember("Left Sill", makeVector3(0, 0, 0), "z", 1200), groupId: floorFrameGroupId },
    { ...createTimberMember("Right Sill", makeVector3(1700, 0, 0), "z", 1200), groupId: floorFrameGroupId },
    { ...createTimberMember("Front Left Post", makeVector3(0, 100, 0), "y", 2000), groupId: postsGroupId },
    { ...createTimberMember("Front Right Post", makeVector3(1700, 100, 0), "y", 2000), groupId: postsGroupId },
    { ...createTimberMember("Back Left Post", makeVector3(0, 100, 1100), "y", 2000), groupId: postsGroupId },
    { ...createTimberMember("Back Right Post", makeVector3(1700, 100, 1100), "y", 2000), groupId: postsGroupId },
    { ...createTimberMember("Front Plate", makeVector3(0, 2100, 0), "x", 1800), groupId: roofFrameGroupId },
    { ...createTimberMember("Back Plate", makeVector3(0, 2100, 1100), "x", 1800), groupId: roofFrameGroupId },
    { ...createTimberMember("Left Plate", makeVector3(0, 2100, 0), "z", 1200), groupId: roofFrameGroupId },
    { ...createTimberMember("Right Plate", makeVector3(1700, 2100, 0), "z", 1200), groupId: roofFrameGroupId },
    { ...createTimberMember("Roof Beam", makeVector3(0, 2500, 550), "x", 1800), groupId: roofFrameGroupId },
    { ...createSheetPanel("Back Wall Panel", makeVector3(100, 100, 0), 1600, 2000, "xy"), groupId: panelsGroupId },
    { ...createSheetPanel("Side Wall Panel", makeVector3(1700, 100, 100), 1000, 2000, "zy"), groupId: panelsGroupId },
  ];

  return parts.map((part) => ({
    ...part,
    id: randomId(),
  }));
}

export function createGardenShedDemoGroups(parts?: PartNode[]): GroupNode[] {
  const groupIds = new Map<string, string>();
  parts?.forEach((part) => {
    if (part.groupId) {
      groupIds.set(part.groupId, part.groupId);
    }
  });

  const ids = Array.from(groupIds.keys());
  return [
    { id: ids[0] ?? randomId(), name: "Floor Frame", parentGroupId: null },
    { id: ids[1] ?? randomId(), name: "Wall Posts", parentGroupId: null },
    { id: ids[2] ?? randomId(), name: "Roof Frame", parentGroupId: null },
    { id: ids[3] ?? randomId(), name: "Wall Panels", parentGroupId: null },
  ];
}

export function createProject(name = "Garden Shed Demo"): ProjectDocument {
  const now = new Date().toISOString();
  const parts = createGardenShedDemoParts();
  const groups = createGardenShedDemoGroups(parts);

  return {
    id: randomId(),
    name,
    version: PROJECT_SCHEMA_VERSION,
    unitPreference: getDefaultUnitPreference(),
    snapSettings: {
      enabled: true,
      moveIncrement: 10,
      resizeIncrement: 5,
      rotateIncrementDeg: 15,
    },
    cameraState: {
      position: makeVector3(2600, 1700, 2600),
      target: makeVector3(DEFAULT_WORKSPACE_FOCUS_XZ, DEFAULT_CAMERA_HEIGHT, DEFAULT_WORKSPACE_FOCUS_XZ),
    },
    groups,
    parts,
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
