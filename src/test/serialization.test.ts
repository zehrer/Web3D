import { describe, expect, it } from "vitest";
import { createProject } from "../lib/project";
import { deserializeProject, serializeProject } from "../lib/serialization";

describe("project serialization", () => {
  it("round-trips a project document", () => {
    const project = createProject("Workbench");
    const payload = serializeProject(project);
    const parsed = deserializeProject(payload);

    expect(parsed.id).toBe(project.id);
    expect(parsed.name).toBe("Workbench");
    expect(parsed.parts).toHaveLength(project.parts.length);
    expect(parsed.parts[0].size.x).toBe(project.parts[0].size.x);
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

    expect(parsed.version).toBe(2);
    expect(parsed.parts[0].objectType).toBe("sheet");
    expect(parsed.parts[0].profileId).toBe("osb3-18");
  });
});
