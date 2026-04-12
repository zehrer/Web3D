export type UnitPreference = "metric-cm" | "metric-mm" | "imperial-in";

export type MaterialKind = "pine" | "oak" | "plywood" | "mdf" | "generic";

export type ThicknessPreset =
  | "board-18mm"
  | "board-24mm"
  | "sheet-12mm"
  | "sheet-18mm"
  | "custom";

export type ActiveTool = "move" | "rotate" | "resize";

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SnapSettings {
  enabled: boolean;
  moveIncrement: number;
  resizeIncrement: number;
  rotateIncrementDeg: number;
}

export interface CameraState {
  position: Vector3Like;
  target: Vector3Like;
}

export interface PartNode {
  id: string;
  name: string;
  size: Vector3Like;
  position: Vector3Like;
  rotation: Vector3Like;
  material: MaterialKind;
  thicknessPreset: ThicknessPreset;
  color: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  version: number;
  unitPreference: UnitPreference;
  snapSettings: SnapSettings;
  cameraState: CameraState;
  parts: PartNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  partCount: number;
}
