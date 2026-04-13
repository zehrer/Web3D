import { PROJECT_SCHEMA_VERSION } from "./project";
import { DEFAULT_OBJECT_COLOR } from "./materials";
import { getProfileById } from "./profiles";
import type { ObjectProfileId, ProjectDocument } from "../types/model";

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

function migrateProjectV1ToV2(legacy: LegacyProjectDocument): ProjectDocument {
  return {
    ...legacy,
    version: PROJECT_SCHEMA_VERSION,
    parts: legacy.parts.map((part) => {
      const profileId = mapLegacyThicknessPreset(part.thicknessPreset);
      const profile = getProfileById(profileId);

      return {
        id: part.id,
        name: part.name,
        objectType: "sheet",
        profileId,
        size: part.size,
        position: part.position,
        rotation: part.rotation,
        color: part.color ?? profile.color ?? DEFAULT_OBJECT_COLOR,
      };
    }),
  };
}

export function serializeProject(project: ProjectDocument): string {
  return JSON.stringify(project);
}

export function deserializeProject(payload: string): ProjectDocument {
  const parsed = JSON.parse(payload) as ProjectDocument | LegacyProjectDocument;

  if (parsed.version === 1) {
    return migrateProjectV1ToV2(parsed as LegacyProjectDocument);
  }

  if (parsed.version !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported project version: ${parsed.version}`);
  }

  if (!parsed.id || !parsed.name || !Array.isArray(parsed.parts)) {
    throw new Error("Invalid project payload");
  }

  return parsed;
}
