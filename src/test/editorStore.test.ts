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

  it("creates rhombus cladding objects with fixed profile and editable length", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    store.getState().addObject("cladding", "rhombus-19x68");
    const cladding = store.getState().project.parts.at(-1)!;

    expect(cladding.objectType).toBe("cladding");
    expect(cladding.size).toEqual({ x: 2000, y: 68, z: 19 });

    store.getState().setPartGeometry(cladding.id, {
      size: { ...cladding.size, x: 2400 },
    });
    expect(store.getState().project.parts.at(-1)?.size.x).toBe(2400);

    store.getState().setPartProfile(cladding.id, "rhombus-27x68");
    const updated = store.getState().project.parts.at(-1)!;
    expect(updated.size).toEqual({ x: 2400, y: 68, z: 27 });
  });

  it("creates repeated cladding patterns in a selected local direction", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());
    const initialCount = store.getState().project.parts.length;

    store.getState().addObject("cladding", "rhombus-19x68");
    const cladding = store.getState().project.parts.at(-1)!;

    store.getState().createCladdingPattern(cladding.id, {
      axis: "y",
      copies: 3,
      spacing: 80,
    });

    const copies = store.getState().project.parts.slice(initialCount + 1);
    expect(copies).toHaveLength(3);
    expect(copies.map((part) => part.position)).toEqual([
      { x: 0, y: 80, z: 0 },
      { x: 0, y: 160, z: 0 },
      { x: 0, y: 240, z: 0 },
    ]);
    expect(copies.every((part) => part.objectType === "cladding")).toBe(true);
  });

  it("applies cladding patterns in rotated local coordinates", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    store.getState().addObject("cladding", "rhombus-19x68");
    const cladding = store.getState().project.parts.at(-1)!;
    store.getState().setPartGeometry(cladding.id, { rotation: { x: 0, y: 0, z: Math.PI / 2 } });

    store.getState().createCladdingPattern(cladding.id, {
      axis: "y",
      copies: 1,
      spacing: 80,
    });

    const copy = store.getState().project.parts.at(-1)!;
    expect(copy.position.x).toBeCloseTo(-80);
    expect(copy.position.y).toBeCloseTo(0);
    expect(copy.position.z).toBeCloseTo(0);
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
