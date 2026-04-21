import { describe, expect, it } from "vitest";
import { createProject } from "../lib/project";
import { createEditorStore } from "../store/editorStore";

describe("editor store", () => {
  it("adds, duplicates, and deletes objects", () => {
    const store = createEditorStore();
    const project = createProject();
    const initialCount = project.parts.length;
    store.getState().hydrateProject(project);

    store.getState().addObject("sheet");
    expect(store.getState().project.parts).toHaveLength(initialCount + 1);
    expect(store.getState().project.parts.at(-1)?.objectType).toBe("sheet");
    expect(store.getState().project.parts.at(-1)?.position).toEqual({ x: 0, y: 0, z: 0 });

    const selectedPartId = store.getState().selectedPartId;
    expect(selectedPartId).toBeTruthy();

    store.getState().duplicateSelectedPart();
    expect(store.getState().project.parts).toHaveLength(initialCount + 2);
    expect(store.getState().project.parts.at(-1)?.position).toEqual({ x: 10, y: 0, z: 0 });

    store.getState().deleteSelectedPart();
    expect(store.getState().project.parts).toHaveLength(initialCount + 1);
  });

  it("supports undo and redo around geometry edits", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    const selectedPartId = store.getState().project.parts[0].id;
    const originalSizeX = store.getState().project.parts[0].size.x;
    store.getState().selectPart(selectedPartId);
    store.getState().setPartGeometry(selectedPartId, { size: { x: 700, y: 300, z: 18 } });
    expect(store.getState().project.parts[0].size.x).toBe(700);

    store.getState().undo();
    expect(store.getState().project.parts[0].size.x).toBe(originalSizeX);

    store.getState().redo();
    expect(store.getState().project.parts[0].size.x).toBe(700);
  });

  it("creates timber objects with fixed cross-sections and editable length", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    store.getState().addObject("timber", "timber-100x100");
    const timber = store.getState().project.parts.at(-1)!;

    expect(timber.objectType).toBe("timber");
    expect(timber.size.y).toBe(100);
    expect(timber.size.z).toBe(100);

    store.getState().setPartGeometry(timber.id, {
      size: { ...timber.size, x: 1800 },
    });
    expect(store.getState().project.parts.at(-1)?.size.x).toBe(1800);

    store.getState().setPartProfile(timber.id, "timber-120x120");
    const updated = store.getState().project.parts.at(-1)!;
    expect(updated.size.x).toBe(1800);
    expect(updated.size.y).toBe(120);
    expect(updated.size.z).toBe(120);
  });

  it("commits transient geometry changes as a single undo step", () => {
    const store = createEditorStore();
    const project = createProject();
    store.getState().hydrateProject(project);

    const selectedPartId = store.getState().project.parts[0].id;
    const originalPositionX = store.getState().project.parts[0].position.x;
    const snapshot = JSON.parse(JSON.stringify(store.getState().project));

    store.getState().previewPartGeometry(selectedPartId, {
      position: { x: 100, y: 0, z: 0 },
    });
    store.getState().previewPartGeometry(selectedPartId, {
      position: { x: 200, y: 0, z: 0 },
    });
    store.getState().finalizeTransientChange(snapshot);

    expect(store.getState().project.parts[0].position.x).toBe(200);
    expect(store.getState().undoStack).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().project.parts[0].position.x).toBe(originalPositionX);
  });

  it("organizes objects in nested groups", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());
    const partId = store.getState().project.parts[0].id;

    store.getState().addGroup();
    const parentGroup = store.getState().project.groups.at(-1)!;
    store.getState().addGroup(parentGroup.id);
    const childGroup = store.getState().project.groups.at(-1)!;

    expect(childGroup.parentGroupId).toBe(parentGroup.id);

    store.getState().movePartToGroup(partId, childGroup.id);
    expect(store.getState().project.parts[0].groupId).toBe(childGroup.id);

    store.getState().moveGroupToGroup(parentGroup.id, childGroup.id);
    expect(store.getState().project.groups.find((group) => group.id === parentGroup.id)?.parentGroupId).toBeNull();

    store.getState().updateGroupName(childGroup.id, "Door Frame");
    expect(store.getState().project.groups.find((group) => group.id === childGroup.id)?.name).toBe("Door Frame");
  });

  it("adds and organizes measurement objects", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());
    const initialMeasurementCount = store.getState().project.measurements.length;

    store.getState().addMeasurement({ x: 0, y: 0, z: 0 }, { x: 300, y: 0, z: 400 });
    const measurement = store.getState().project.measurements.at(-1)!;

    expect(measurement.name).toBe(`Measure ${initialMeasurementCount + 1}`);
    expect(store.getState().selectedMeasurementId).toBe(measurement.id);
    expect(store.getState().selectedPartId).toBeNull();

    store.getState().addGroup();
    const group = store.getState().project.groups.at(-1)!;
    store.getState().moveMeasurementToGroup(measurement.id, group.id);
    expect(store.getState().project.measurements.find((item) => item.id === measurement.id)?.groupId).toBe(group.id);

    store.getState().updateMeasurement(measurement.id, (current) => ({
      ...current,
      name: "Shelf Width",
    }));
    expect(store.getState().project.measurements.find((item) => item.id === measurement.id)?.name).toBe("Shelf Width");

    store.getState().deleteSelectedMeasurement();
    expect(store.getState().project.measurements).toHaveLength(initialMeasurementCount);
  });
});
