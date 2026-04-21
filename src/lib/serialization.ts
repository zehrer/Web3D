import { PROJECT_SCHEMA_VERSION } from "./project";
import { DEFAULT_OBJECT_COLOR } from "./materials";
import { getProfileById } from "./profiles";
import type { ObjectProfileId, PartNode, ProjectDocument } from "../types/model";

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

type ProjectDocumentV2 = Omit<ProjectDocument, "groups" | "parts" | "version"> & {
  version: 2;
  parts: Array<Omit<PartNode, "groupId">>;
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
  return {
    ...legacy,
    version: PROJECT_SCHEMA_VERSION,
    groups: [],
    parts: legacy.parts.map((part) => {
      const profileId = mapLegacyThicknessPreset(part.thicknessPreset);
      const profile = getProfileById(profileId);

      return {
        id: part.id,
        name: part.name,
        objectType: "sheet",
        profileId,
        groupId: null,
        size: part.size,
        position: part.position,
        rotation: part.rotation,
        color: part.color ?? profile.color ?? DEFAULT_OBJECT_COLOR,
      };
    }),
  };
}

function migrateProjectV2ToCurrent(project: ProjectDocumentV2): ProjectDocument {
  return {
    ...project,
    version: PROJECT_SCHEMA_VERSION,
    groups: [],
    parts: project.parts.map((part) => ({
      ...part,
      groupId: null,
    })),
  };
}

export function serializeProject(project: ProjectDocument): string {
  return JSON.stringify(project);
}

export function deserializeProject(payload: string): ProjectDocument {
  const parsed = JSON.parse(payload) as ProjectDocument | LegacyProjectDocument;

  if (parsed.version === 1) {
    return migrateProjectV1ToCurrent(parsed as LegacyProjectDocument);
  }

  if (parsed.version === 2) {
    return migrateProjectV2ToCurrent(parsed as ProjectDocumentV2);
  }

  if (parsed.version !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported project version: ${parsed.version}`);
  }

  if (!parsed.id || !parsed.name || !Array.isArray(parsed.parts) || !Array.isArray(parsed.groups)) {
    throw new Error("Invalid project payload");
  }

  return parsed;
}
