import { useEditorStore } from "../store/editorStore";

interface ToolbarProps {
  onSaveProject: () => void | Promise<void>;
  onNewProject: () => void;
}

export function Toolbar({ onNewProject, onSaveProject }: ToolbarProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const addBoxPart = useEditorStore((state) => state.addBoxPart);
  const duplicateSelectedPart = useEditorStore((state) => state.duplicateSelectedPart);
  const deleteSelectedPart = useEditorStore((state) => state.deleteSelectedPart);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const project = useEditorStore((state) => state.project);
  const commitCameraState = useEditorStore((state) => state.commitCameraState);

  function setCameraPreset(preset: "perspective" | "top" | "front" | "right") {
    const target = { x: 0, y: 150, z: 0 };

    const position =
      preset === "top"
        ? { x: 0, y: 1600, z: 0.01 }
        : preset === "front"
          ? { x: 0, y: 500, z: 1600 }
          : preset === "right"
            ? { x: 1600, y: 500, z: 0 }
            : { x: 1200, y: 900, z: 1200 };

    commitCameraState({ position, target });
  }

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__eyebrow">Web3D Designer</span>
        <strong>{project.name}</strong>
      </div>

      <div className="toolbar__cluster">
        <button className="toolbar__button" onClick={onNewProject} type="button">
          New
        </button>
        <button className="toolbar__button toolbar__button--accent" onClick={() => void onSaveProject()} type="button">
          Save
        </button>
      </div>

      <div className="toolbar__cluster">
        <button className="toolbar__button" onClick={() => addBoxPart()} type="button">
          Add Box
        </button>
        <button className="toolbar__button" onClick={duplicateSelectedPart} type="button">
          Duplicate
        </button>
        <button className="toolbar__button toolbar__button--danger" onClick={deleteSelectedPart} type="button">
          Delete
        </button>
      </div>

      <div className="toolbar__cluster">
        {(["move", "rotate", "resize"] as const).map((tool) => (
          <button
            key={tool}
            className={`toolbar__button ${activeTool === tool ? "toolbar__button--selected" : ""}`}
            onClick={() => setActiveTool(tool)}
            type="button"
          >
            {tool}
          </button>
        ))}
      </div>

      <div className="toolbar__cluster">
        {(["perspective", "top", "front", "right"] as const).map((preset) => (
          <button key={preset} className="toolbar__button" onClick={() => setCameraPreset(preset)} type="button">
            {preset}
          </button>
        ))}
      </div>

      <div className="toolbar__cluster">
        <button className="toolbar__button" onClick={undo} type="button">
          Undo
        </button>
        <button className="toolbar__button" onClick={redo} type="button">
          Redo
        </button>
      </div>
    </header>
  );
}
