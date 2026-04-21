import { describe, expect, it } from "vitest";
import { createGltfFilename, createStlFilename, exportProjectToGltf, exportProjectToStl } from "../lib/export";
import { createObjectPart, PROJECT_SCHEMA_VERSION } from "../lib/project";
import type { ProjectDocument } from "../types/model";

describe("3D export", () => {
  it("exports anchored objects as ASCII STL", () => {
    const project: ProjectDocument = {
      id: "project-1",
      name: "Workbench Prototype",
      version: PROJECT_SCHEMA_VERSION,
      unitPreference: "metric-mm",
      snapSettings: {
        enabled: true,
        moveIncrement: 10,
        resizeIncrement: 5,
        rotateIncrementDeg: 15,
      },
      cameraState: {
        position: { x: 1000, y: 800, z: 1000 },
        target: { x: 0, y: 0, z: 0 },
      },
      groups: [],
      parts: [
        createObjectPart(0, {
          objectType: "timber",
          profileId: "timber-100x100",
          size: { x: 100, y: 50, z: 25 },
          position: { x: 0, y: 0, z: 0 },
        }),
      ],
      createdAt: "2026-04-13T00:00:00.000Z",
      updatedAt: "2026-04-13T00:00:00.000Z",
    };

    const stl = exportProjectToStl(project);

    expect(stl.startsWith("solid exported")).toBe(true);
    expect(stl).toContain("facet normal");
    expect(stl).toContain("vertex 0 0 0");
    expect(stl).toContain("vertex 100 50 25");
  });

  it("builds a clean download filename from the project name", () => {
    const project = { name: "Garden Shelf / Draft 1" } as ProjectDocument;
    expect(createStlFilename(project)).toBe("garden-shelf-draft-1.stl");
    expect(createGltfFilename(project)).toBe("garden-shelf-draft-1.gltf");
  });

  it("exports glTF with complete Web3D project metadata", async () => {
    const project: ProjectDocument = {
      id: "project-1",
      name: "Grouped Workbench",
      version: PROJECT_SCHEMA_VERSION,
      unitPreference: "metric-mm",
      snapSettings: {
        enabled: true,
        moveIncrement: 10,
        resizeIncrement: 5,
        rotateIncrementDeg: 15,
      },
      cameraState: {
        position: { x: 1000, y: 800, z: 1000 },
        target: { x: 0, y: 0, z: 0 },
      },
      groups: [{ id: "group-1", name: "Frame", parentGroupId: null }],
      parts: [
        {
          ...createObjectPart(0, {
            objectType: "timber",
            profileId: "timber-100x100",
            size: { x: 100, y: 50, z: 25 },
            position: { x: 0, y: 0, z: 0 },
          }),
          id: "part-1",
          groupId: "group-1",
        },
      ],
      createdAt: "2026-04-13T00:00:00.000Z",
      updatedAt: "2026-04-13T00:00:00.000Z",
    };

    const gltf = JSON.parse(await exportProjectToGltf(project));

    expect(gltf.asset.version).toBe("2.0");
    expect(gltf.extras.web3dProjectDocument).toMatchObject({
      id: "project-1",
      groups: [{ id: "group-1", name: "Frame", parentGroupId: null }],
      parts: [{ id: "part-1", groupId: "group-1", objectType: "timber", profileId: "timber-100x100" }],
    });
    expect(JSON.stringify(gltf.nodes)).toContain("Frame");
  });
});
