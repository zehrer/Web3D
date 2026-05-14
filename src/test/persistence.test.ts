import { describe, expect, it } from "vitest";
import { createProject } from "../lib/project";
import {
  deleteProjectDocument,
  getLastProjectId,
  listProjectSummaries,
  loadGlobalMaterialLibrary,
  loadMostRecentProject,
  loadProjectDocument,
  saveGlobalMaterialLibrary,
  saveProjectDocument,
} from "../lib/persistence";

describe("project persistence", () => {
  it("saves and reloads a project from IndexedDB", async () => {
    const project = createProject("Workshop Shelf");
    await saveProjectDocument(project);

    const loaded = await loadProjectDocument(project.id);

    expect(loaded?.name).toBe("Workshop Shelf");
    expect(loaded?.parts).toHaveLength(project.parts.length);
  });

  it("lists saved projects by recency", async () => {
    const older = createProject("Older");
    older.updatedAt = "2026-01-01T00:00:00.000Z";
    const newer = createProject("Newer");
    newer.updatedAt = "2026-02-01T00:00:00.000Z";

    await saveProjectDocument(older);
    await saveProjectDocument(newer);

    const summaries = await listProjectSummaries();

    expect(summaries[0]?.name).toBe("Newer");
    expect(summaries[1]?.name).toBe("Older");
  });

  it("loads the most recent project using the stored last project id", async () => {
    const project = createProject("Recent Project");
    await saveProjectDocument(project);

    const loaded = await loadMostRecentProject();

    expect(loaded?.id).toBe(project.id);
  });

  it("deletes a saved project and clears the last project pointer", async () => {
    const project = createProject("Disposable Project");
    await saveProjectDocument(project);

    await deleteProjectDocument(project.id);

    await expect(loadProjectDocument(project.id)).resolves.toBeNull();
    await expect(getLastProjectId()).resolves.toBeNull();
  });

  it("seeds and persists the global material library separately from projects", async () => {
    const library = await loadGlobalMaterialLibrary();
    expect(library.materials.length).toBeGreaterThan(0);

    const renamed = {
      ...library,
      materials: library.materials.map((material, index) =>
        index === 0 ? { ...material, name: "Custom Global Material" } : material,
      ),
    };
    await saveGlobalMaterialLibrary(renamed);

    const loaded = await loadGlobalMaterialLibrary();
    expect(loaded.materials[0].name).toBe("Custom Global Material");
  });
});
