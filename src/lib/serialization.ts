import { PROJECT_SCHEMA_VERSION, createInitialMaterials } from "./project";
import { DEFAULT_OBJECT_COLOR } from "./materials";
import { getProfileById } from "./profiles";
import type { MeasurementNode, ObjectProfileId, PartNode, ProjectDocument } from "../types/model";

const WEB3D_PROJECT_FILE_FORMAT = "web3d-project";
const WEB3D_PROJECT_FILE_FORMAT_VERSION = 1;

type LegacyThicknessPreset = "board-18mm" | "board-24mm" | "sheet-12mm" | "sheet-18mm" | "custom";

type LegacyProjectDocument = {
  id: string;
  name: string;
  version: 1;
  unitPreference: ProjectDocument["unitPreference"];
  snapSettings: ProjectDocument["snapSettings"];
  cameraState: ProjectDocument["cameraState"];
  parts: Array<{
    id: string;
    name: string;
    size: ProjectDocument["parts"][number]["size"];
    position: ProjectDocument["parts"][number]["position"];
    rotation: ProjectDocument["parts"][number]["rotation"];
    thicknessPreset: LegacyThicknessPreset;
    color?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ProjectDocumentV2 = Omit<ProjectDocument, "groups" | "measurements" | "parts" | "version"> & {
  version: 2;
  parts: Array<Omit<PartNode, "groupId">>;
};

type ProjectDocumentV3 = Omit<ProjectDocument, "measurements" | "version"> & {
  version: 3;
};

type ProjectDocumentV4 = Omit<ProjectDocument, "materialGroups" | "materials" | "version"> & {
  version: 4;
  parts: Array<Omit<PartNode, "materialId">>;
};

type Web3dProjectFile = {
  format: typeof WEB3D_PROJECT_FILE_FORMAT;
  formatVersion: typeof WEB3D_PROJECT_FILE_FORMAT_VERSION;
  application: "Web3D Designer";
  exportedAt: string;
  project: ProjectDocument;
};

function mapLegacyThicknessPreset(preset: LegacyThicknessPreset): ObjectProfileId {
  switch (preset) {
    case "sheet-12mm":
      return "osb3-12";
    case "board-24mm":
      return "osb3-22";
    case "sheet-18mm":
    case "board-18mm":
    case "custom":
    default:
      return "osb3-18";
  }
}

function migrateProjectV1ToCurrent(legacy: LegacyProjectDocument): ProjectDocument {
  const v4 = {
    id: legacy.id,
    name: legacy.name,
    version: 4 as const,
    unitPreference: legacy.unitPreference,
    snapSettings: legacy.snapSettings,
    cameraState: legacy.cameraState,
    groups: [],
    measurements: [],
    parts: legacy.parts.map((part) => {
      const profileId = mapLegacyThicknessPreset(part.thicknessPreset);
      const profile = getProfileById(profileId);
      return {
        id: part.id,
        name: part.name,
        objectType: "sheet" as const,
        profileId,
        groupId: null,
        size: part.size,
        position: part.position,
        rotation: part.rotation,
        color: part.color ?? profile.color ?? DEFAULT_OBJECT_COLOR,
      };
    }),
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
  return migrateProjectV4ToCurrent(v4 as unknown as ProjectDocumentV4);
}

function migrateProjectV2ToCurrent(project: ProjectDocumentV2): ProjectDocument {
  const v4 = {
    ...project,
    version: 4 as const,
    groups: [],
    measurements: [],
    parts: project.parts.map((part) => ({
      ...part,
      groupId: null,
    })),
  };
  return migrateProjectV4ToCurrent(v4 as unknown as ProjectDocumentV4);
}

function migrateProjectV3ToCurrent(project: ProjectDocumentV3): ProjectDocument {
  const v4 = {
    ...project,
    version: 4 as const,
    parts: project.parts.map((part) => ({ ...part, materialId: null as null })),
    measurements: [],
  };
  return migrateProjectV4ToCurrent(v4 as unknown as ProjectDocumentV4);
}

function migrateProjectV4ToCurrent(project: ProjectDocumentV4): ProjectDocument {
  const { materialGroups, materials, profileToMaterialId } = createInitialMaterials();
  return {
    ...project,
    version: PROJECT_SCHEMA_VERSION,
    materialGroups,
    materials,
    parts: project.parts.map((part) => ({
      ...part,
      materialId: profileToMaterialId.get(part.profileId) ?? null,
    })),
  };
}

export function serializeProject(project: ProjectDocument): string {
  return JSON.stringify(project);
}

export function serializeProjectFile(project: ProjectDocument): string {
  const projectFile: Web3dProjectFile = {
    format: WEB3D_PROJECT_FILE_FORMAT,
    formatVersion: WEB3D_PROJECT_FILE_FORMAT_VERSION,
    application: "Web3D Designer",
    exportedAt: new Date().toISOString(),
    project,
  };

  return JSON.stringify(projectFile, null, 2);
}

export function deserializeProject(payload: string): ProjectDocument {
  const parsed = JSON.parse(payload) as ProjectDocument | LegacyProjectDocument;

  if (parsed.version === 1) {
    return migrateProjectV1ToCurrent(parsed as LegacyProjectDocument);
  }

  if (parsed.version === 2) {
    return migrateProjectV2ToCurrent(parsed as ProjectDocumentV2);
  }

  if (parsed.version === 3) {
    return migrateProjectV3ToCurrent(parsed as ProjectDocumentV3);
  }

  if (parsed.version === 4) {
    return migrateProjectV4ToCurrent(parsed as unknown as ProjectDocumentV4);
  }

  if (parsed.version !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported project version: ${parsed.version}`);
  }

  if (
    !parsed.id ||
    !parsed.name ||
    !Array.isArray(parsed.parts) ||
    !Array.isArray(parsed.groups) ||
    !Array.isArray((parsed as ProjectDocument & { measurements?: MeasurementNode[] }).measurements)
  ) {
    throw new Error("Invalid project payload");
  }

  return parsed;
}

export function deserializeProjectFile(payload: string): ProjectDocument {
  const parsed = JSON.parse(payload) as Partial<Web3dProjectFile> & {
    extras?: {
      web3dProjectDocument?: ProjectDocument;
    };
  };

  if (parsed.format === WEB3D_PROJECT_FILE_FORMAT && parsed.project) {
    return deserializeProject(JSON.stringify(parsed.project));
  }

  if (parsed.extras?.web3dProjectDocument) {
    return deserializeProject(JSON.stringify(parsed.extras.web3dProjectDocument));
  }

  return deserializeProject(payload);
}
