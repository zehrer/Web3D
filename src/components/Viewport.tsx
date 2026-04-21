import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls, Text, TransformControls } from "@react-three/drei";
import { ArrowHelper, Euler, Vector3, type Object3D } from "three";
import {
  BeamIcon,
  CladdingIcon,
  DuplicateIcon,
  GlassIcon,
  HelpIcon,
  MoveIcon,
  PerspectiveIcon,
  PlusIcon,
  RedoIcon,
  ResizeIcon,
  RulerIcon,
  RotateIcon,
  SheetIcon,
  TopViewIcon,
  TrashIcon,
  UndoIcon,
} from "./Icons";
import { getResizableAxes } from "../lib/profiles";
import { applyResizeFromHandle } from "../lib/geometry";
import { cloneProject, DEFAULT_CAMERA_HEIGHT, DEFAULT_WORKSPACE_FOCUS_XZ } from "../lib/project";
import { snapValue, toRadians } from "../lib/snap";
import { formatLength } from "../lib/units";
import { editorStore, useEditorStore } from "../store/editorStore";
import type { MeasurementNode, PartNode, ProjectDocument, Vector3Like } from "../types/model";

const GRID_STEP = 100;
const BUILD_AREA_SIZE = 6000;
const BUILD_MARGIN = GRID_STEP;
const GRID_SIZE = BUILD_AREA_SIZE + BUILD_MARGIN * 2;
const GRID_DIVISIONS = GRID_SIZE / GRID_STEP;
const WORKSPACE_CENTER = BUILD_AREA_SIZE / 2;
const GROUND_PLANE_SIZE = 12400;

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

type MeasurementDraft = {
  start: Vector3Like;
  end: Vector3Like;
};

type PartCornerDefinition = {
  key: string;
  local: [number, number, number];
  world: Vector3Like;
};

function vectorToTuple(vector: Vector3Like): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function distanceBetween(start: Vector3Like, end: Vector3Like): number {
  return Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
}

function getPartCorners(part: PartNode): PartCornerDefinition[] {
  const rotation = new Euler(part.rotation.x, part.rotation.y, part.rotation.z);

  return ([0, part.size.x] as const).flatMap((x) =>
    ([0, part.size.y] as const).flatMap((y) =>
      ([0, part.size.z] as const).map((z) => {
        const local: [number, number, number] = [x, y, z];
        const world = new Vector3(x, y, z).applyEuler(rotation).add(new Vector3(part.position.x, part.position.y, part.position.z));

        return {
          key: `${x}-${y}-${z}`,
          local,
          world: {
            x: world.x,
            y: world.y,
            z: world.z,
          },
        };
      }),
    ),
  );
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

function KeyDimensionGuide({ part }: { part: PartNode }) {
  const unitPreference = useEditorStore((state) => state.project.unitPreference);
  const guideOffset = Math.max(36, part.size.z * 0.2);
  const guideZ = part.size.z + guideOffset;
  const guideY = Math.max(16, Math.min(36, part.size.y * 0.12));
  const labelPosition: [number, number, number] = [part.size.x / 2, guideY + 18, guideZ];
  const measureText = formatLength(part.size.x, unitPreference);

  return (
    <>
      <Line points={[[0, guideY, guideZ], [part.size.x, guideY, guideZ]]} color="#505a66" lineWidth={1.2} />
      <Line points={[[0, 0, part.size.z], [0, guideY, guideZ]]} color="#9aa6b1" lineWidth={1} dashed dashSize={10} gapSize={6} />
      <Line
        points={[[part.size.x, 0, part.size.z], [part.size.x, guideY, guideZ]]}
        color="#9aa6b1"
        lineWidth={1}
        dashed
        dashSize={10}
        gapSize={6}
      />
      <mesh position={[0, guideY, guideZ]}>
        <sphereGeometry args={[7, 20, 20]} />
        <meshStandardMaterial color="#f5f7fa" />
      </mesh>
      <mesh position={[part.size.x, guideY, guideZ]}>
        <sphereGeometry args={[7, 20, 20]} />
        <meshStandardMaterial color="#f5f7fa" />
      </mesh>
      <Html position={labelPosition} center style={{ pointerEvents: "none" }}>
        <div className="measurement-chip">{measureText}</div>
      </Html>
    </>
  );
}

function MeasurementGuide({
  measurement,
  selected,
}: {
  measurement: Pick<MeasurementNode, "start" | "end" | "color">;
  selected?: boolean;
}) {
  const unitPreference = useEditorStore((state) => state.project.unitPreference);
  const start: [number, number, number] = [measurement.start.x, measurement.start.y + 18, measurement.start.z];
  const end: [number, number, number] = [measurement.end.x, measurement.end.y + 18, measurement.end.z];
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + 42,
    (start[2] + end[2]) / 2,
  ];
  const length = distanceBetween(measurement.start, measurement.end);

  return (
    <>
      <Line points={[start, end]} color={selected ? "#5f6b76" : measurement.color} lineWidth={selected ? 2.2 : 1.5} />
      <mesh position={start}>
        <sphereGeometry args={[11, 18, 18]} />
        <meshStandardMaterial color={selected ? "#5f6b76" : measurement.color} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[11, 18, 18]} />
        <meshStandardMaterial color={selected ? "#5f6b76" : measurement.color} />
      </mesh>
      <Html position={midpoint} center style={{ pointerEvents: "none" }}>
        <div className={`measurement-chip ${selected ? "measurement-chip--selected" : ""}`}>
          {formatLength(length, unitPreference)}
        </div>
      </Html>
    </>
  );
}

function ObjectMaterial({ part }: { part: PartNode }) {
  if (part.objectType === "glass") {
    return (
      <meshStandardMaterial
        color={part.color}
        depthWrite={false}
        metalness={0}
        opacity={0.38}
        roughness={0.08}
        transparent
      />
    );
  }

  return <meshStandardMaterial color={part.color} roughness={0.82} metalness={0.08} />;
}

function AxisArrow({
  direction,
  length,
  color,
}: {
  direction: [number, number, number];
  length: number;
  color: string;
}) {
  const helper = useMemo(
    () => new ArrowHelper(new Vector3(...direction).normalize(), new Vector3(0, 0, 0), length, color, 100, 55),
    [color, direction, length],
  );

  return <primitive object={helper} />;
}

function AxisGuide() {
  return (
    <>
      <AxisArrow direction={[1, 0, 0]} length={900} color="#c96b54" />
      <AxisArrow direction={[0, 1, 0]} length={720} color="#5b9b67" />
      <AxisArrow direction={[0, 0, 1]} length={900} color="#5682c8" />

      <Text position={[980, 8, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={92} color="#c96b54">
        X
      </Text>
      <Text position={[0, 780, 0]} fontSize={92} color="#5b9b67">
        Y
      </Text>
      <Text position={[0, 8, 980]} rotation={[-Math.PI / 2, 0, 0]} fontSize={92} color="#5682c8">
        Z
      </Text>
    </>
  );
}

function Scene() {
  const parts = useEditorStore((state) => state.project.parts);
  const measurements = useEditorStore((state) => state.project.measurements);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectedMeasurementId = useEditorStore((state) => state.selectedMeasurementId);
  const activeTool = useEditorStore((state) => state.activeTool);
  const snapSettings = useEditorStore((state) => state.project.snapSettings);
  const selectPart = useEditorStore((state) => state.selectPart);
  const selectMeasurement = useEditorStore((state) => state.selectMeasurement);
  const addMeasurement = useEditorStore((state) => state.addMeasurement);
  const previewPartGeometry = useEditorStore((state) => state.previewPartGeometry);
  const finalizeTransientChange = useEditorStore((state) => state.finalizeTransientChange);
  const [measurementDraft, setMeasurementDraft] = useState<MeasurementDraft | null>(null);
  const objectRefs = useRef<Record<string, Object3D | null>>({});
  const orbitRef = useRef<{ target: Vector3; update: () => void; enabled: boolean } | null>(null);
  const transformSnapshotRef = useRef<ProjectDocument | null>(null);
  const resizeDragRef = useRef<ResizeDragState | null>(null);
  const handleMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
  const handleUpRef = useRef<(() => void) | null>(null);
  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? null;
  const selectedObject = selectedPart ? objectRefs.current[selectedPart.id] : null;

  function snapGroundPoint(point: Vector3): Vector3Like {
    return {
      x: snapValue(point.x, snapSettings.moveIncrement, snapSettings.enabled),
      y: 0,
      z: snapValue(point.z, snapSettings.moveIncrement, snapSettings.enabled),
    };
  }

  function handleMeasurePoint(nextPoint: Vector3Like) {
    if (!measurementDraft) {
      selectPart(null);
      setMeasurementDraft({ start: nextPoint, end: nextPoint });
      return;
    }

    if (distanceBetween(measurementDraft.start, nextPoint) > 0) {
      addMeasurement(measurementDraft.start, nextPoint);
    }

    setMeasurementDraft(null);
  }

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

  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasurementDraft(null);
    }
  }, [activeTool]);

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
    ? ([
        { axis: "x", direction: 1, position: [selectedPart.size.x, selectedPart.size.y / 2, selectedPart.size.z / 2] },
        { axis: "x", direction: -1, position: [0, selectedPart.size.y / 2, selectedPart.size.z / 2] },
        { axis: "y", direction: 1, position: [selectedPart.size.x / 2, selectedPart.size.y, selectedPart.size.z / 2] },
        { axis: "y", direction: -1, position: [selectedPart.size.x / 2, 0, selectedPart.size.z / 2] },
        { axis: "z", direction: 1, position: [selectedPart.size.x / 2, selectedPart.size.y / 2, selectedPart.size.z] },
        { axis: "z", direction: -1, position: [selectedPart.size.x / 2, selectedPart.size.y / 2, 0] },
      ] as HandleDefinition[]).filter((handle) => getResizableAxes(selectedPart).includes(handle.axis))
    : [];
  const transformMode = activeTool === "rotate" ? "rotate" : "translate";

  return (
    <>
      <color attach="background" args={["#f3f5f2"]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[1400, 2200, 1200]} intensity={1.35} />
      <directionalLight position={[-800, 900, -1200]} intensity={0.35} />

      <CameraController orbitRef={orbitRef} />
      <gridHelper
        args={[GRID_SIZE, GRID_DIVISIONS, "#cfd7dd", "#cfd7dd"]}
        position={[WORKSPACE_CENTER, 0, WORKSPACE_CENTER]}
      />
      <AxisGuide />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[WORKSPACE_CENTER, -0.5, WORKSPACE_CENTER]}
        onPointerMove={(event) => {
          if (activeTool === "measure" && measurementDraft) {
            event.stopPropagation();
            setMeasurementDraft((draft) => (draft ? { ...draft, end: snapGroundPoint(event.point) } : draft));
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (activeTool === "measure") {
            handleMeasurePoint(snapGroundPoint(event.point));
          } else {
            selectPart(null);
            setMeasurementDraft(null);
          }
        }}
      >
        <planeGeometry args={[GROUND_PLANE_SIZE, GROUND_PLANE_SIZE]} />
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
            <mesh
              position={[part.size.x / 2, part.size.y / 2, part.size.z / 2]}
              castShadow={part.objectType !== "glass"}
              receiveShadow={part.objectType !== "glass"}
            >
              <boxGeometry args={[part.size.x, part.size.y, part.size.z]} />
              <ObjectMaterial part={part} />
              <Edges color={isSelected ? "#eef1f4" : "#53606d"} />
            </mesh>
            {isSelected ? <KeyDimensionGuide part={part} /> : null}

            {activeTool === "measure"
              ? getPartCorners(part).map((corner) => (
                  <mesh
                    key={corner.key}
                    position={corner.local}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMeasurePoint(corner.world);
                    }}
                    onPointerMove={(event) => {
                      if (measurementDraft) {
                        event.stopPropagation();
                        setMeasurementDraft((draft) => (draft ? { ...draft, end: corner.world } : draft));
                      }
                    }}
                  >
                    <sphereGeometry args={[13, 18, 18]} />
                    <meshStandardMaterial color="#276f9f" emissive="#0c3a53" depthTest={false} />
                  </mesh>
                ))
              : null}

            {isSelected && activeTool === "resize"
              ? handleDefinitions.map((handle) => (
                  <mesh
                    key={`${handle.axis}-${handle.direction}`}
                    position={handle.position}
                    onPointerDown={(event) => beginResizeDrag(event, part, handle.axis, handle.direction)}
                  >
                    <sphereGeometry args={[16, 18, 18]} />
                    <meshStandardMaterial color="#6f7b87" emissive="#3f4852" />
                  </mesh>
                ))
              : null}
          </group>
        );
      })}

      {measurements.map((measurement) => (
        <group
          key={measurement.id}
          onClick={(event) => {
            event.stopPropagation();
            selectMeasurement(measurement.id);
          }}
        >
          <MeasurementGuide measurement={measurement} selected={measurement.id === selectedMeasurementId} />
        </group>
      ))}

      {measurementDraft ? <MeasurementGuide measurement={{ ...measurementDraft, color: "#276f9f" }} selected /> : null}

      {selectedObject && selectedPart ? (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
          translationSnap={transformMode === "translate" && snapSettings.enabled ? snapSettings.moveIncrement : undefined}
          rotationSnap={transformMode === "rotate" && snapSettings.enabled ? toRadians(snapSettings.rotateIncrementDeg) : undefined}
          onMouseDown={() => {
            transformSnapshotRef.current = cloneProject(editorStore.getState().project);
            if (orbitRef.current) {
              orbitRef.current.enabled = false;
            }
          }}
          onObjectChange={() => {
            previewPartGeometry(selectedPart.id, {
              position: {
                x: snapValue(selectedObject.position.x, snapSettings.moveIncrement, transformMode === "translate" && snapSettings.enabled),
                y: snapValue(selectedObject.position.y, snapSettings.moveIncrement, transformMode === "translate" && snapSettings.enabled),
                z: snapValue(selectedObject.position.z, snapSettings.moveIncrement, transformMode === "translate" && snapSettings.enabled),
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const addObject = useEditorStore((state) => state.addObject);
  const duplicateSelectedPart = useEditorStore((state) => state.duplicateSelectedPart);
  const deleteSelectedPart = useEditorStore((state) => state.deleteSelectedPart);
  const deleteSelectedMeasurement = useEditorStore((state) => state.deleteSelectedMeasurement);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const commitCameraState = useEditorStore((state) => state.commitCameraState);
  const selectedPart = useEditorStore((state) =>
    state.project.parts.find((part) => part.id === state.selectedPartId) ?? null,
  );
  const selectedMeasurement = useEditorStore((state) =>
    state.project.measurements.find((measurement) => measurement.id === state.selectedMeasurementId) ?? null,
  );
  const unitPreference = useEditorStore((state) => state.project.unitPreference);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function setCameraPreset(preset: "perspective" | "top" | "front" | "right") {
    const target = {
      x: DEFAULT_WORKSPACE_FOCUS_XZ,
      y: DEFAULT_CAMERA_HEIGHT,
      z: DEFAULT_WORKSPACE_FOCUS_XZ,
    };

    const position =
      preset === "top"
        ? { x: DEFAULT_WORKSPACE_FOCUS_XZ, y: 2400, z: DEFAULT_WORKSPACE_FOCUS_XZ + 0.01 }
        : preset === "front"
          ? { x: DEFAULT_WORKSPACE_FOCUS_XZ, y: 900, z: 3000 }
          : preset === "right"
            ? { x: 3000, y: 900, z: DEFAULT_WORKSPACE_FOCUS_XZ }
            : { x: 2600, y: 1700, z: 2600 };

    commitCameraState({ position, target });
  }

  return (
    <section className="viewport-panel">
      <div className="viewport-canvas">
        <div className="viewport-rail viewport-rail--left">
          <div className="viewport-rail__menu-wrapper" ref={addMenuRef}>
            <button
              className={`viewport-rail__button ${showAddMenu ? "viewport-rail__button--active" : ""}`}
              onClick={() => setShowAddMenu((value) => !value)}
              title="Add object"
              type="button"
            >
              <PlusIcon width={18} height={18} />
            </button>
            {showAddMenu ? (
              <div className="viewport-add-menu">
                <button
                  className="viewport-add-menu__item"
                  onClick={() => {
                    addObject("sheet");
                    setShowAddMenu(false);
                  }}
                  type="button"
                >
                  <SheetIcon width={16} height={16} />
                  <span>Sheet</span>
                </button>
                <button
                  className="viewport-add-menu__item"
                  onClick={() => {
                    addObject("timber");
                    setShowAddMenu(false);
                  }}
                  type="button"
                >
                  <BeamIcon width={16} height={16} />
                  <span>Timber</span>
                </button>
                <button
                  className="viewport-add-menu__item"
                  onClick={() => {
                    addObject("cladding");
                    setShowAddMenu(false);
                  }}
                  type="button"
                >
                  <CladdingIcon width={16} height={16} />
                  <span>Cladding</span>
                </button>
                <button
                  className="viewport-add-menu__item"
                  onClick={() => {
                    addObject("glass");
                    setShowAddMenu(false);
                  }}
                  type="button"
                >
                  <GlassIcon width={16} height={16} />
                  <span>Glass</span>
                </button>
              </div>
            ) : null}
          </div>
          {([
            ["move", MoveIcon, "Move"],
            ["rotate", RotateIcon, "Rotate"],
            ["resize", ResizeIcon, "Resize"],
            ["measure", RulerIcon, "Measure"],
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
            <span>Use measure to click two grid points or object corners.</span>
            <span>Units and snap live in the project settings.</span>
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
        ) : selectedMeasurement ? (
          <div className="viewport-context-bar">
            <button className="viewport-context-bar__button viewport-context-bar__button--danger" onClick={deleteSelectedMeasurement} type="button">
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
