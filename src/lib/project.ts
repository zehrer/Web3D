import { getDefaultUnitPreference } from "./locale";
import { createObjectName, createSizeFromProfile, getDefaultProfileId, getProfileById } from "./profiles";
import type {
  ObjectProfileId,
  ObjectType,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  Vector3Like,
} from "../types/model";

export const PROJECT_SCHEMA_VERSION = 2;
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
  const parts = [
    createTimberMember("Front Sill", makeVector3(0, 0, 0), "x", 1800),
    createTimberMember("Back Sill", makeVector3(0, 0, 1100), "x", 1800),
    createTimberMember("Left Sill", makeVector3(0, 0, 0), "z", 1200),
    createTimberMember("Right Sill", makeVector3(1700, 0, 0), "z", 1200),
    createTimberMember("Front Left Post", makeVector3(0, 100, 0), "y", 2000),
    createTimberMember("Front Right Post", makeVector3(1700, 100, 0), "y", 2000),
    createTimberMember("Back Left Post", makeVector3(0, 100, 1100), "y", 2000),
    createTimberMember("Back Right Post", makeVector3(1700, 100, 1100), "y", 2000),
    createTimberMember("Front Plate", makeVector3(0, 2100, 0), "x", 1800),
    createTimberMember("Back Plate", makeVector3(0, 2100, 1100), "x", 1800),
    createTimberMember("Left Plate", makeVector3(0, 2100, 0), "z", 1200),
    createTimberMember("Right Plate", makeVector3(1700, 2100, 0), "z", 1200),
    createTimberMember("Roof Beam", makeVector3(0, 2500, 550), "x", 1800),
    createSheetPanel("Back Wall Panel", makeVector3(100, 100, 0), 1600, 2000, "xy"),
    createSheetPanel("Side Wall Panel", makeVector3(1700, 100, 100), 1000, 2000, "zy"),
  ];

  return parts.map((part) => ({
    ...part,
    id: randomId(),
  }));
}

export function createProject(name = "Garden Shed Demo"): ProjectDocument {
  const now = new Date().toISOString();
  const parts = createGardenShedDemoParts();

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
