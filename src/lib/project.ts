import { MATERIAL_COLORS } from "./materials";
import { getDefaultUnitPreference } from "./locale";
import type {
  MaterialKind,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  ThicknessPreset,
  Vector3Like,
} from "../types/model";

export const PROJECT_SCHEMA_VERSION = 1;

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeVector3(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

export function cloneProject(project: ProjectDocument): ProjectDocument {
  return JSON.parse(JSON.stringify(project)) as ProjectDocument;
}

export function createBoxPart(
  index: number,
  options?: {
    material?: MaterialKind;
    thicknessPreset?: ThicknessPreset;
    size?: Vector3Like;
    position?: Vector3Like;
  },
): PartNode {
  const material = options?.material ?? "plywood";
  const thicknessPreset = options?.thicknessPreset ?? "board-18mm";

  return {
    id: randomId(),
    name: `Part ${index + 1}`,
    size: options?.size ?? makeVector3(600, 300, 18),
    position: options?.position ?? makeVector3(index * 90, 150, 0),
    rotation: makeVector3(0, 0, 0),
    material,
    thicknessPreset,
    color: MATERIAL_COLORS[material],
  };
}

export function createProject(name = "Untitled Project"): ProjectDocument {
  const now = new Date().toISOString();

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
      position: makeVector3(1200, 900, 1200),
      target: makeVector3(0, 150, 0),
    },
    parts: [createBoxPart(0)],
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
