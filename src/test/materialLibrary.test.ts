import { describe, expect, it } from "vitest";
import { buildPortableProject, reconcileProjectMaterials } from "../lib/materialLibrary";
import { createInitialMaterials, createObjectPart, createProject } from "../lib/project";

describe("material library reconciliation", () => {
  it("exports only materials used by project parts", () => {
    const project = createProject("Portable");
    const library = createInitialMaterials();
    const material = library.materials.find((item) => item.name === "100 x 100 mm")!;
    project.parts.push({
      ...createObjectPart(0, {
        objectType: "timber",
        materialId: material.id,
        size: { x: 300, y: 100, z: 100 },
      }),
      id: "part-1",
      materialId: material.id,
    });

    const portable = buildPortableProject(project, library);

    expect(portable.materials).toHaveLength(1);
    expect(portable.materials[0]).toMatchObject({ id: material.id, name: material.name });
    expect(portable.materialGroups.some((group) => group.id === material.groupId)).toBe(true);
  });

  it("deduplicates imported embedded materials and remaps part material ids", () => {
    const project = createProject("Imported");
    const library = createInitialMaterials();
    const existing = library.materials.find((item) => item.name === "100 x 100 mm")!;
    const embedded = {
      ...existing,
      id: "embedded-material",
      groupId: "embedded-group",
    };
    project.materialGroups = [{ id: "embedded-group", name: "Timber", parentGroupId: null }];
    project.materials = [embedded];
    project.parts.push({
      ...createObjectPart(0, {
        objectType: "timber",
        materialId: embedded.id,
        size: { x: 300, y: 100, z: 100 },
      }),
      id: "part-1",
      materialId: embedded.id,
    });

    const reconciled = reconcileProjectMaterials(project, library);

    expect(reconciled.library.materials).toHaveLength(library.materials.length);
    expect(reconciled.project.materials).toEqual([]);
    expect(reconciled.project.materialGroups).toEqual([]);
    expect(reconciled.project.parts[0].materialId).toBe(existing.id);
  });

  it("adds imported materials that do not exist in the internal library", () => {
    const project = createProject("Imported Custom");
    const library = createInitialMaterials();
    const custom = {
      ...library.materials.find((item) => item.name === "100 x 100 mm")!,
      id: "custom-material",
      name: "Custom 120 x 80",
      defaultSize: { x: 2500, y: 120, z: 80 },
    };
    project.materials = [custom];
    project.parts.push({
      ...createObjectPart(0, {
        objectType: "timber",
        materialId: custom.id,
        size: { x: 300, y: 120, z: 80 },
      }),
      id: "part-1",
      materialId: custom.id,
    });

    const reconciled = reconcileProjectMaterials(project, library);

    expect(reconciled.library.materials).toHaveLength(library.materials.length + 1);
    expect(reconciled.library.materials.find((material) => material.id === "custom-material")?.name).toBe("Custom 120 x 80");
    expect(reconciled.project.parts[0].materialId).toBe("custom-material");
  });
});
