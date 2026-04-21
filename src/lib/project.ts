import { getDefaultUnitPreference } from "./locale";
import { createObjectName, createSizeFromProfile, getDefaultProfileId, getProfileById } from "./profiles";
import type {
  GroupNode,
  MeasurementNode,
  ObjectProfileId,
  ObjectType,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  Vector3Like,
} from "../types/model";

export const PROJECT_SCHEMA_VERSION = 4;
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

const STARTER_CAMERA_STATE = {
  position: makeVector3(-705.7154087703138, 2859.212384687871, 5946.487896192788),
  target: makeVector3(1279.5804187764884, 496.4627250274756, -144.7612291108867),
};

const STARTER_GROUPS: GroupNode[] = [
  { id: "ca47f92f-f03d-4c77-968b-f7e2ca412a47", name: "LeftSide", parentGroupId: "270b2a45-c742-4e14-b762-2869e41eb041" },
  { id: "09beadf6-243f-461e-bbcf-630beb589908", name: "RightSide", parentGroupId: "270b2a45-c742-4e14-b762-2869e41eb041" },
  { id: "51a0c2f9-c77a-4021-b094-203e1902bc2f", name: "BackSide", parentGroupId: "270b2a45-c742-4e14-b762-2869e41eb041" },
  { id: "d4a5079a-d02e-4747-9967-c8bfa2b22c2a", name: "Front", parentGroupId: "270b2a45-c742-4e14-b762-2869e41eb041" },
  { id: "94944204-9127-4e9b-95c7-046c196fbb1c", name: "Roof", parentGroupId: "270b2a45-c742-4e14-b762-2869e41eb041" },
  { id: "270b2a45-c742-4e14-b762-2869e41eb041", name: "Shed", parentGroupId: null },
];

const STARTER_PARTS: PartNode[] = [
  {
    id: "d4c05a37-a528-4d63-8293-f4fb3f3efc3c",
    name: "LeftBack",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2000, 100, 100),
    position: makeVector3(100, 100, 0),
    rotation: makeVector3(0, 0, Math.PI / 2),
    color: "#a77b4e",
    groupId: "ca47f92f-f03d-4c77-968b-f7e2ca412a47",
  },
  {
    id: "c948f143-b8e0-4f78-bd48-426a19c06b31",
    name: "LeftFront",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2000, 100, 100),
    position: makeVector3(100, 100, 750),
    rotation: makeVector3(0, 0, Math.PI / 2),
    color: "#a77b4e",
    groupId: "ca47f92f-f03d-4c77-968b-f7e2ca412a47",
  },
  {
    id: "d9412402-96ef-477b-873c-c2c78d1484e2",
    name: "LeftTop",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(100, 2200, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "ca47f92f-f03d-4c77-968b-f7e2ca412a47",
  },
  {
    id: "38e442e4-0e18-4265-88e1-a19dfa20d058",
    name: "RightBack",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2000, 100, 100),
    position: makeVector3(2200, 100, 0),
    rotation: makeVector3(0, 0, Math.PI / 2),
    color: "#a77b4e",
    groupId: "09beadf6-243f-461e-bbcf-630beb589908",
  },
  {
    id: "f4598d62-d21f-4f3f-abb5-716052b7f0ac",
    name: "LeftBottom",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(100, 0, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "ca47f92f-f03d-4c77-968b-f7e2ca412a47",
  },
  {
    id: "d7de7baf-c82c-40f1-a8f2-e3482378ddf9",
    name: "RightBottom",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(2200, 0, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "09beadf6-243f-461e-bbcf-630beb589908",
  },
  {
    id: "943b1023-4887-4be1-be49-f7aefcc719bb",
    name: "RightFront",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2000, 100, 100),
    position: makeVector3(2200, 100, 750),
    rotation: makeVector3(0, 0, Math.PI / 2),
    color: "#a77b4e",
    groupId: "09beadf6-243f-461e-bbcf-630beb589908",
  },
  {
    id: "be1676b3-e744-4c08-9854-133d8004a291",
    name: "RightTop",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(2200, 2200, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "09beadf6-243f-461e-bbcf-630beb589908",
  },
  {
    id: "a33c1824-cef3-4f70-81fe-96523f2c1467",
    name: "BackTop",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2200, 100, 100),
    position: makeVector3(0, 2100, 0),
    rotation: makeVector3(0, 0, 0),
    color: "#a77b4e",
    groupId: "51a0c2f9-c77a-4021-b094-203e1902bc2f",
  },
  {
    id: "4c0d2305-5543-4639-bc7a-cf6632d062b9",
    name: "BackBottom",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2100, 100, 100),
    position: makeVector3(0, 0, 0),
    rotation: makeVector3(0, 0, 0),
    color: "#a77b4e",
    groupId: "51a0c2f9-c77a-4021-b094-203e1902bc2f",
  },
  {
    id: "56267b75-c84d-4e82-96e0-a08fb3a3d362",
    name: "FrontBottom",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(1300, 100, 100),
    position: makeVector3(800, 0, 750),
    rotation: makeVector3(0, 0, 0),
    color: "#a77b4e",
    groupId: "d4a5079a-d02e-4747-9967-c8bfa2b22c2a",
  },
  {
    id: "964d0fc3-288d-4689-b4f7-e6908bfc8ae2",
    name: "FrontTop",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2200, 100, 100),
    position: makeVector3(0, 2100, 750),
    rotation: makeVector3(0, 0, 0),
    color: "#a77b4e",
    groupId: "d4a5079a-d02e-4747-9967-c8bfa2b22c2a",
  },
  {
    id: "9021a27c-03f9-482f-82fa-81a5f0380a7d",
    name: "FrontLeft",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(2000, 100, 100),
    position: makeVector3(900, 100, 750),
    rotation: makeVector3(0, 0, Math.PI / 2),
    color: "#a77b4e",
    groupId: "d4a5079a-d02e-4747-9967-c8bfa2b22c2a",
  },
  {
    id: "5fdb0370-374f-48e6-8b87-179da1a95195",
    name: "RoofTimber3",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(1900, 2200, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "94944204-9127-4e9b-95c7-046c196fbb1c",
  },
  {
    id: "a56f27c9-bb67-489c-abb3-de2a7d4d11d9",
    name: "RoofTimber1",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(700, 2200, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "94944204-9127-4e9b-95c7-046c196fbb1c",
  },
  {
    id: "eca93f44-0e69-4f98-9df7-1419d0656893",
    name: "RoofTimber2",
    objectType: "timber",
    profileId: "timber-100x100",
    size: makeVector3(850, 100, 100),
    position: makeVector3(1310, 2200, 0),
    rotation: makeVector3(0, -Math.PI / 2, 0),
    color: "#a77b4e",
    groupId: "94944204-9127-4e9b-95c7-046c196fbb1c",
  },
];

const STARTER_MEASUREMENTS: MeasurementNode[] = [
  {
    id: "5faaf419-0f92-4404-94ea-306380bd005c",
    name: "Door Opening",
    groupId: null,
    start: makeVector3(810, 0, 860),
    end: makeVector3(2200, 0, 860),
    color: "#276f9f",
  },
  {
    id: "620c5c0a-271e-4233-9eca-3deeacdf367f",
    name: "Side Depth",
    groupId: null,
    start: makeVector3(2210, 0, 0),
    end: makeVector3(2200, 0, 860),
    color: "#276f9f",
  },
  {
    id: "a36fd60f-9969-41bd-9b63-e43c764196c3",
    name: "Top Width",
    groupId: null,
    start: makeVector3(100.00000000000011, 2200, 850),
    end: makeVector3(2100, 2200, 850),
    color: "#276f9f",
  },
  {
    id: "8738d59a-b28d-4f11-a673-2b1c71a8c223",
    name: "Overall Width",
    groupId: null,
    start: makeVector3(1.4210854715202004e-14, 0, 2.842170943040401e-14),
    end: makeVector3(2200, 0, 0),
    color: "#276f9f",
  },
];

function cloneVector(value: Vector3Like): Vector3Like {
  return { x: value.x, y: value.y, z: value.z };
}

function createStarterGroups() {
  const groupIdMap = new Map<string, string>();
  STARTER_GROUPS.forEach((group) => groupIdMap.set(group.id, randomId()));

  const groups = STARTER_GROUPS.map((group) => ({
    ...group,
    id: groupIdMap.get(group.id)!,
    parentGroupId: group.parentGroupId ? (groupIdMap.get(group.parentGroupId) ?? null) : null,
  }));

  return { groups, groupIdMap };
}

function createStarterParts(groupIdMap: Map<string, string>): PartNode[] {
  return STARTER_PARTS.map((part) => ({
    ...part,
    id: randomId(),
    groupId: part.groupId ? (groupIdMap.get(part.groupId) ?? null) : null,
    size: cloneVector(part.size),
    position: cloneVector(part.position),
    rotation: cloneVector(part.rotation),
  }));
}

function createStarterMeasurements(groupIdMap: Map<string, string>): MeasurementNode[] {
  return STARTER_MEASUREMENTS.map((measurement) => ({
    ...measurement,
    id: randomId(),
    groupId: measurement.groupId ? (groupIdMap.get(measurement.groupId) ?? null) : null,
    start: cloneVector(measurement.start),
    end: cloneVector(measurement.end),
  }));
}

export function createProject(name = "Garden Shed Demo"): ProjectDocument {
  const now = new Date().toISOString();
  const { groups, groupIdMap } = createStarterGroups();
  const parts = createStarterParts(groupIdMap);
  const measurements = createStarterMeasurements(groupIdMap);

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
      position: cloneVector(STARTER_CAMERA_STATE.position),
      target: cloneVector(STARTER_CAMERA_STATE.target),
    },
    groups,
    parts,
    measurements,
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
