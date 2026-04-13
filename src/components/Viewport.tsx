import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Edges, Html, OrbitControls, TransformControls } from "@react-three/drei";
import { Vector3, type Object3D } from "three";
import {
  BeamIcon,
  DuplicateIcon,
  HelpIcon,
  MoveIcon,
  PerspectiveIcon,
  PlusIcon,
  RedoIcon,
  ResizeIcon,
  RotateIcon,
  SheetIcon,
  TopViewIcon,
  TrashIcon,
  UndoIcon,
} from "./Icons";
import { getObjectTypeLabel } from "../lib/profiles";
import { applyResizeFromHandle } from "../lib/geometry";
import { cloneProject } from "../lib/project";
import { snapValue, toRadians } from "../lib/snap";
import { formatLength } from "../lib/units";
import { editorStore, useEditorStore } from "../store/editorStore";
import type { PartNode, ProjectDocument, Vector3Like } from "../types/model";

type ResizeDragState = {
  axis: keyof Vector3Like;
  direction: 1 | -1;
  startX: number;
  startY: number;
  snapshot: ProjectDocument;
  initialPart: PartNode;
};

type HandleDefinition = {
  axis: keyof Vector3Like;
  direction: 1 | -1;
  position: [number, number, number];
};

function vectorToTuple(vector: Vector3Like): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function CameraController({
  orbitRef,
}: {
  orbitRef: RefObject<{ target: Vector3; update: () => void; enabled: boolean } | null>;
}) {
  const cameraState = useEditorStore((state) => state.project.cameraState);
  const commitCameraState = useEditorStore((state) => state.commitCameraState);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
    orbitRef.current?.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
    orbitRef.current?.update();
  }, [
    camera,
    cameraState.position.x,
    cameraState.position.y,
    cameraState.position.z,
    cameraState.target.x,
    cameraState.target.y,
    cameraState.target.z,
    orbitRef,
  ]);

  return (
    <OrbitControls
      ref={orbitRef as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      onEnd={() => {
        if (!orbitRef.current) {
          return;
        }

        commitCameraState({
          position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          target: {
            x: orbitRef.current.target.x,
            y: orbitRef.current.target.y,
            z: orbitRef.current.target.z,
          },
        });
      }}
    />
  );
}

function SelectedBadge({ part }: { part: PartNode }) {
  const unitPreference = useEditorStore((state) => state.project.unitPreference);

  return (
    <Html position={[part.size.x / 2, part.size.y + 45, part.size.z / 2]} center>
      <div className="dimension-chip">
        <strong>{part.name}</strong>
        <span>
          {formatLength(part.size.x, unitPreference)} × {formatLength(part.size.y, unitPreference)} ×{" "}
          {formatLength(part.size.z, unitPreference)}
        </span>
      </div>
    </Html>
  );
}

function Scene() {
  const parts = useEditorStore((state) => state.project.parts);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const activeTool = useEditorStore((state) => state.activeTool);
  const snapSettings = useEditorStore((state) => state.project.snapSettings);
  const selectPart = useEditorStore((state) => state.selectPart);
  const previewPartGeometry = useEditorStore((state) => state.previewPartGeometry);
  const finalizeTransientChange = useEditorStore((state) => state.finalizeTransientChange);
  const objectRefs = useRef<Record<string, Object3D | null>>({});
  const orbitRef = useRef<{ target: Vector3; update: () => void; enabled: boolean } | null>(null);
  const transformSnapshotRef = useRef<ProjectDocument | null>(null);
  const resizeDragRef = useRef<ResizeDragState | null>(null);
  const handleMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
  const handleUpRef = useRef<(() => void) | null>(null);
  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? null;
  const selectedObject = selectedPart ? objectRefs.current[selectedPart.id] : null;

  useEffect(() => {
    return () => {
      if (handleMoveRef.current) {
        window.removeEventListener("pointermove", handleMoveRef.current);
      }

      if (handleUpRef.current) {
        window.removeEventListener("pointerup", handleUpRef.current);
      }
    };
  }, []);

  function beginResizeDrag(event: ThreeEvent<PointerEvent>, part: PartNode, axis: keyof Vector3Like, direction: 1 | -1) {
    event.stopPropagation();
    selectPart(part.id);

    if (handleMoveRef.current) {
      window.removeEventListener("pointermove", handleMoveRef.current);
    }

    if (handleUpRef.current) {
      window.removeEventListener("pointerup", handleUpRef.current);
    }

    resizeDragRef.current = {
      axis,
      direction,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      snapshot: cloneProject(editorStore.getState().project),
      initialPart: JSON.parse(JSON.stringify(part)) as PartNode,
    };

    if (orbitRef.current) {
      orbitRef.current.enabled = false;
    }

    handleMoveRef.current = (pointerEvent: PointerEvent) => {
      const drag = resizeDragRef.current;
      if (!drag) {
        return;
      }

      const horizontalDelta = pointerEvent.clientX - drag.startX;
      const verticalDelta = drag.startY - pointerEvent.clientY;
      const axisDeltaPx = drag.axis === "y" ? verticalDelta : horizontalDelta;
      previewPartGeometry(
        drag.initialPart.id,
        applyResizeFromHandle(
          drag.initialPart,
          drag.axis,
          drag.direction,
          axisDeltaPx,
          snapSettings.resizeIncrement,
          snapSettings.enabled,
        ),
      );
    };

    handleUpRef.current = () => {
      if (resizeDragRef.current) {
        finalizeTransientChange(resizeDragRef.current.snapshot);
        resizeDragRef.current = null;
      }

      if (orbitRef.current) {
        orbitRef.current.enabled = true;
      }

      if (handleMoveRef.current) {
        window.removeEventListener("pointermove", handleMoveRef.current);
      }

      if (handleUpRef.current) {
        window.removeEventListener("pointerup", handleUpRef.current);
      }
    };

    window.addEventListener("pointermove", handleMoveRef.current);
    window.addEventListener("pointerup", handleUpRef.current);
  }

  const handleDefinitions: HandleDefinition[] = selectedPart
    ? [
        { axis: "x", direction: 1, position: [selectedPart.size.x, selectedPart.size.y / 2, selectedPart.size.z / 2] },
        { axis: "x", direction: -1, position: [0, selectedPart.size.y / 2, selectedPart.size.z / 2] },
        { axis: "y", direction: 1, position: [selectedPart.size.x / 2, selectedPart.size.y, selectedPart.size.z / 2] },
        { axis: "y", direction: -1, position: [selectedPart.size.x / 2, 0, selectedPart.size.z / 2] },
        { axis: "z", direction: 1, position: [selectedPart.size.x / 2, selectedPart.size.y / 2, selectedPart.size.z] },
        { axis: "z", direction: -1, position: [selectedPart.size.x / 2, selectedPart.size.y / 2, 0] },
      ]
    : [];

  return (
    <>
      <color attach="background" args={["#0c1217"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[900, 1400, 700]} intensity={1.3} />
      <directionalLight position={[-400, 500, -900]} intensity={0.4} />

      <CameraController orbitRef={orbitRef} />
      <gridHelper args={[4000, 40, "#745f41", "#26323b"]} position={[0, 0, 0]} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        onClick={(event) => {
          event.stopPropagation();
          selectPart(null);
        }}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {parts.map((part) => {
        const isSelected = part.id === selectedPartId;

        return (
          <group
            key={part.id}
            ref={(node) => {
              objectRefs.current[part.id] = node;
            }}
            position={vectorToTuple(part.position)}
            rotation={vectorToTuple(part.rotation)}
            onClick={(event) => {
              event.stopPropagation();
              selectPart(part.id);
            }}
          >
            <mesh position={[part.size.x / 2, part.size.y / 2, part.size.z / 2]} castShadow receiveShadow>
              <boxGeometry args={[part.size.x, part.size.y, part.size.z]} />
              <meshStandardMaterial color={part.color} roughness={0.82} metalness={0.08} />
              <Edges color={isSelected ? "#fff5d7" : "#1b2329"} />
            </mesh>
            {isSelected ? <SelectedBadge part={part} /> : null}

            {isSelected && activeTool === "resize"
              ? handleDefinitions.map((handle) => (
                  <mesh
                    key={`${handle.axis}-${handle.direction}`}
                    position={handle.position}
                    onPointerDown={(event) => beginResizeDrag(event, part, handle.axis, handle.direction)}
                  >
                    <sphereGeometry args={[16, 18, 18]} />
                    <meshStandardMaterial color="#ffcf6b" emissive="#8c5d17" />
                  </mesh>
                ))
              : null}
          </group>
        );
      })}

      {selectedObject && selectedPart && activeTool !== "resize" ? (
        <TransformControls
          object={selectedObject}
          mode={activeTool === "move" ? "translate" : "rotate"}
          translationSnap={snapSettings.enabled ? snapSettings.moveIncrement : undefined}
          rotationSnap={snapSettings.enabled ? toRadians(snapSettings.rotateIncrementDeg) : undefined}
          onMouseDown={() => {
            transformSnapshotRef.current = cloneProject(editorStore.getState().project);
            if (orbitRef.current) {
              orbitRef.current.enabled = false;
            }
          }}
          onObjectChange={() => {
            previewPartGeometry(selectedPart.id, {
              position: {
                x: snapValue(selectedObject.position.x, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
                y: snapValue(selectedObject.position.y, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
                z: snapValue(selectedObject.position.z, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
              },
              rotation: {
                x: selectedObject.rotation.x,
                y: selectedObject.rotation.y,
                z: selectedObject.rotation.z,
              },
            });
          }}
          onMouseUp={() => {
            if (transformSnapshotRef.current) {
              finalizeTransientChange(transformSnapshotRef.current);
              transformSnapshotRef.current = null;
            }

            if (orbitRef.current) {
              orbitRef.current.enabled = true;
            }
          }}
        />
      ) : null}
    </>
  );
}

export function Viewport() {
  const [showHelp, setShowHelp] = useState(false);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const addObject = useEditorStore((state) => state.addObject);
  const duplicateSelectedPart = useEditorStore((state) => state.duplicateSelectedPart);
  const deleteSelectedPart = useEditorStore((state) => state.deleteSelectedPart);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const commitCameraState = useEditorStore((state) => state.commitCameraState);
  const selectedPart = useEditorStore((state) =>
    state.project.parts.find((part) => part.id === state.selectedPartId) ?? null,
  );
  const unitPreference = useEditorStore((state) => state.project.unitPreference);

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
    <section className="viewport-panel">
      <div className="viewport-canvas">
        <div className="viewport-rail viewport-rail--left">
          <button className="viewport-rail__button" onClick={() => addObject("sheet")} title="Add sheet" type="button">
            <SheetIcon width={18} height={18} />
          </button>
          <button className="viewport-rail__button" onClick={() => addObject("timber")} title="Add timber" type="button">
            <BeamIcon width={18} height={18} />
          </button>
          <button className="viewport-rail__button" onClick={() => addObject(selectedPart?.objectType ?? "sheet")} title="Add same type" type="button">
            <PlusIcon width={18} height={18} />
          </button>
          {([
            ["move", MoveIcon, "Move"],
            ["rotate", RotateIcon, "Rotate"],
            ["resize", ResizeIcon, "Resize"],
          ] as const).map(([tool, Icon, label]) => (
            <button
              key={tool}
              className={`viewport-rail__button ${activeTool === tool ? "viewport-rail__button--active" : ""}`}
              onClick={() => setActiveTool(tool)}
              title={label}
              type="button"
            >
              <Icon width={18} height={18} />
            </button>
          ))}
          <div className="viewport-rail__divider" />
          <button className="viewport-rail__button" onClick={undo} title="Undo" type="button">
            <UndoIcon width={18} height={18} />
          </button>
          <button className="viewport-rail__button" onClick={redo} title="Redo" type="button">
            <RedoIcon width={18} height={18} />
          </button>
        </div>

        <div className="viewport-rail viewport-rail--right">
          <button className="viewport-rail__button" onClick={() => setCameraPreset("perspective")} title="Perspective view" type="button">
            <PerspectiveIcon width={18} height={18} />
          </button>
          <button className="viewport-rail__button" onClick={() => setCameraPreset("top")} title="Top view" type="button">
            <TopViewIcon width={18} height={18} />
          </button>
          <button className={`viewport-rail__button ${showHelp ? "viewport-rail__button--active" : ""}`} onClick={() => setShowHelp((value) => !value)} title="Help" type="button">
            <HelpIcon width={18} height={18} />
          </button>
        </div>

        {showHelp ? (
          <div className="viewport-help">
            <strong>Help</strong>
            <span>Drag to orbit the camera.</span>
            <span>Use move and rotate for gizmos.</span>
            <span>Use resize to drag the yellow handles.</span>
            <span>Units and snap live in the project settings.</span>
          </div>
        ) : null}

        {selectedPart ? (
          <div className="viewport-selection-chip">
            <strong>{selectedPart.name}</strong>
            <span>
              {getObjectTypeLabel(selectedPart.objectType)} · {formatLength(selectedPart.size.x, unitPreference)} /{" "}
              {formatLength(selectedPart.size.y, unitPreference)} / {formatLength(selectedPart.size.z, unitPreference)}
            </span>
          </div>
        ) : null}

        {selectedPart ? (
          <div className="viewport-context-bar">
            <button className="viewport-context-bar__button" onClick={duplicateSelectedPart} type="button">
              <DuplicateIcon width={16} height={16} />
              <span>Duplicate</span>
            </button>
            <button className="viewport-context-bar__button viewport-context-bar__button--danger" onClick={deleteSelectedPart} type="button">
              <TrashIcon width={16} height={16} />
              <span>Delete</span>
            </button>
          </div>
        ) : null}

        <Canvas shadows camera={{ fov: 38, near: 1, far: 12000 }}>
          <Scene />
        </Canvas>
      </div>
    </section>
  );
}
