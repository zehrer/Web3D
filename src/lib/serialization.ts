import { PROJECT_SCHEMA_VERSION } from "./project";
import type { ProjectDocument } from "../types/model";

export function serializeProject(project: ProjectDocument): string {
  return JSON.stringify(project);
}

export function deserializeProject(payload: string): ProjectDocument {
  const parsed = JSON.parse(payload) as ProjectDocument;

  if (parsed.version !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported project version: ${parsed.version}`);
  }

  if (!parsed.id || !parsed.name || !Array.isArray(parsed.parts)) {
    throw new Error("Invalid project payload");
  }

  return parsed;
}
