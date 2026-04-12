import { describe, expect, it } from "vitest";
import { createProject } from "../lib/project";
import { createEditorStore } from "../store/editorStore";

describe("editor store", () => {
  it("adds, duplicates, and deletes parts", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    store.getState().addBoxPart();
    expect(store.getState().project.parts).toHaveLength(2);

    const selectedPartId = store.getState().selectedPartId;
    expect(selectedPartId).toBeTruthy();

    store.getState().duplicateSelectedPart();
    expect(store.getState().project.parts).toHaveLength(3);

    store.getState().deleteSelectedPart();
    expect(store.getState().project.parts).toHaveLength(2);
  });

  it("supports undo and redo around geometry edits", () => {
    const store = createEditorStore();
    store.getState().hydrateProject(createProject());

    const selectedPartId = store.getState().project.parts[0].id;
    store.getState().selectPart(selectedPartId);
    store.getState().setPartGeometry(selectedPartId, { size: { x: 700, y: 300, z: 18 } });
    expect(store.getState().project.parts[0].size.x).toBe(700);

    store.getState().undo();
    expect(store.getState().project.parts[0].size.x).toBe(600);

    store.getState().redo();
    expect(store.getState().project.parts[0].size.x).toBe(700);
  });

  it("commits transient geometry changes as a single undo step", () => {
    const store = createEditorStore();
    const project = createProject();
    store.getState().hydrateProject(project);

    const selectedPartId = store.getState().project.parts[0].id;
    const snapshot = JSON.parse(JSON.stringify(store.getState().project));

    store.getState().previewPartGeometry(selectedPartId, {
      position: { x: 100, y: 150, z: 0 },
    });
    store.getState().previewPartGeometry(selectedPartId, {
      position: { x: 200, y: 150, z: 0 },
    });
    store.getState().finalizeTransientChange(snapshot);

    expect(store.getState().project.parts[0].position.x).toBe(200);
    expect(store.getState().undoStack).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().project.parts[0].position.x).toBe(0);
  });
});
