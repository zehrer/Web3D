import { describe, expect, it } from "vitest";
import { createProject } from "../lib/project";
import { deserializeProject, deserializeProjectFile, serializeProject, serializeProjectFile } from "../lib/serialization";

describe("project serialization", () => {
  it("round-trips a project document", () => {
    const project = createProject("Workbench");
    const payload = serializeProject(project);
    const parsed = deserializeProject(payload);

    expect(parsed.id).toBe(project.id);
    expect(parsed.name).toBe("Workbench");
    expect(parsed.groups).toHaveLength(project.groups.length);
    expect(parsed.parts).toHaveLength(project.parts.length);
    expect(parsed.parts[0].size.x).toBe(project.parts[0].size.x);
    expect(parsed.parts[0].groupId).toBe(project.parts[0].groupId);
    expect(parsed.parts.some((part) => part.objectType === "sheet")).toBe(true);
    expect(parsed.parts.some((part) => part.objectType === "timber")).toBe(true);
  });

  it("migrates legacy thickness-based projects into sheet objects", () => {
    const payload = JSON.stringify({
      id: "legacy-project",
      name: "Legacy",
      version: 1,
      unitPreference: "metric-cm",
      snapSettings: { enabled: true, moveIncrement: 10, resizeIncrement: 5, rotateIncrementDeg: 15 },
      cameraState: { position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } },
      parts: [
        {
          id: "legacy-part",
          name: "OSB Panel",
          size: { x: 1200, y: 600, z: 18 },
          position: { x: 0, y: 150, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          thicknessPreset: "sheet-18mm",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const parsed = deserializeProject(payload);

    expect(parsed.version).toBe(3);
    expect(parsed.groups).toEqual([]);
    expect(parsed.parts[0].groupId).toBeNull();
    expect(parsed.parts[0].objectType).toBe("sheet");
    expect(parsed.parts[0].profileId).toBe("osb3-18");
  });

  it("migrates v2 object projects into grouped-capable projects", () => {
    const project = createProject("V2");
    const payload = JSON.stringify({
      ...project,
      version: 2,
      parts: project.parts.map(({ groupId: _groupId, ...part }) => part),
      groups: undefined,
    });

    const parsed = deserializeProject(payload);

    expect(parsed.version).toBe(3);
    expect(parsed.groups).toEqual([]);
    expect(parsed.parts.every((part) => part.groupId === null)).toBe(true);
  });

  it("round-trips native Web3D project files with group and object names", () => {
    const project = createProject("Exported Project");
    const firstGroup = project.groups[0];
    const firstPart = project.parts[0];
    firstGroup.name = "Custom Folder";
    firstPart.name = "Custom Timber";
    firstPart.groupId = firstGroup.id;

    const parsed = deserializeProjectFile(serializeProjectFile(project));

    expect(parsed.name).toBe("Exported Project");
    expect(parsed.groups[0]).toMatchObject({ id: firstGroup.id, name: "Custom Folder" });
    expect(parsed.parts[0]).toMatchObject({ id: firstPart.id, name: "Custom Timber", groupId: firstGroup.id });
    expect(parsed.snapSettings).toEqual(project.snapSettings);
    expect(parsed.cameraState).toEqual(project.cameraState);
  });

  it("imports Web3D project data embedded in glTF extras", () => {
    const project = createProject("Embedded Project");
    project.groups[0].name = "Embedded Folder";
    project.parts[0].name = "Embedded Object";
    const payload = JSON.stringify({
      asset: { version: "2.0" },
      extras: {
        web3dProjectDocument: project,
      },
    });

    const parsed = deserializeProjectFile(payload);

    expect(parsed.name).toBe("Embedded Project");
    expect(parsed.groups[0].name).toBe("Embedded Folder");
    expect(parsed.parts[0].name).toBe("Embedded Object");
  });
});
