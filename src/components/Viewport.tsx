import { useEffect, useRef, type RefObject } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Edges, Html, OrbitControls, TransformControls } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
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
      ref={orbitRef}
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
    <Html position={[0, part.size.y / 2 + 45, 0]} center>
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
  const meshRefs = useRef<Record<string, Mesh | null>>({});
  const orbitRef = useRef<{ target: Vector3; update: () => void; enabled: boolean } | null>(null);
  const transformSnapshotRef = useRef<ProjectDocument | null>(null);
  const resizeDragRef = useRef<ResizeDragState | null>(null);
  const handleMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
  const handleUpRef = useRef<(() => void) | null>(null);
  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? null;
  const selectedMesh = selectedPart ? meshRefs.current[selectedPart.id] : null;

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
        { axis: "x", direction: 1, position: [selectedPart.size.x / 2, 0, 0] },
        { axis: "x", direction: -1, position: [-selectedPart.size.x / 2, 0, 0] },
        { axis: "y", direction: 1, position: [0, selectedPart.size.y / 2, 0] },
        { axis: "y", direction: -1, position: [0, -selectedPart.size.y / 2, 0] },
        { axis: "z", direction: 1, position: [0, 0, selectedPart.size.z / 2] },
        { axis: "z", direction: -1, position: [0, 0, -selectedPart.size.z / 2] },
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
          <mesh
            key={part.id}
            ref={(node) => {
              meshRefs.current[part.id] = node;
            }}
            position={vectorToTuple(part.position)}
            rotation={vectorToTuple(part.rotation)}
            onClick={(event) => {
              event.stopPropagation();
              selectPart(part.id);
            }}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[part.size.x, part.size.y, part.size.z]} />
            <meshStandardMaterial color={part.color} roughness={0.82} metalness={0.08} />
            <Edges color={isSelected ? "#fff5d7" : "#1b2329"} />
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
          </mesh>
        );
      })}

      {selectedMesh && selectedPart && activeTool !== "resize" ? (
        <TransformControls
          object={selectedMesh}
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
                x: snapValue(selectedMesh.position.x, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
                y: snapValue(selectedMesh.position.y, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
                z: snapValue(selectedMesh.position.z, snapSettings.moveIncrement, activeTool === "move" && snapSettings.enabled),
              },
              rotation: {
                x: selectedMesh.rotation.x,
                y: selectedMesh.rotation.y,
                z: selectedMesh.rotation.z,
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
  const selectedPart = useEditorStore((state) =>
    state.project.parts.find((part) => part.id === state.selectedPartId) ?? null,
  );
  const unitPreference = useEditorStore((state) => state.project.unitPreference);

  return (
    <section className="viewport-panel">
      <div className="viewport-panel__header">
        <div>
          <span className="panel-card__title">Viewport</span>
          <p className="viewport-panel__meta">
            Drag with orbit controls. Use gizmos for move and rotate, then switch to resize for face handles.
          </p>
        </div>
        {selectedPart ? (
          <div className="viewport-panel__selection">
            <strong>{selectedPart.name}</strong>
            <span>
              {formatLength(selectedPart.size.x, unitPreference)} / {formatLength(selectedPart.size.y, unitPreference)} /{" "}
              {formatLength(selectedPart.size.z, unitPreference)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="viewport-canvas">
        <Canvas shadows camera={{ fov: 38, near: 1, far: 12000 }}>
          <Scene />
        </Canvas>
      </div>
    </section>
  );
}
