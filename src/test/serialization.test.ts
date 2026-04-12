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
    expect(parsed.parts[0].size.x).toBe(project.parts[0].size.x);
  });
});
