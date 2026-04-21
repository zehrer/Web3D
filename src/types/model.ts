export type UnitPreference = "metric-cm" | "metric-mm" | "imperial-in";

export type ObjectType = "sheet" | "timber";

export type SheetProfileId = "osb3-12" | "osb3-15" | "osb3-18" | "osb3-22" | "plywood-18";

export type TimberProfileId = "timber-60x80" | "timber-80x100" | "timber-100x100" | "timber-120x120";

export type ObjectProfileId = SheetProfileId | TimberProfileId;

export type ActiveTool = "move" | "rotate" | "resize" | "measure";

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
  objectType: ObjectType;
  profileId: ObjectProfileId;
  groupId: string | null;
  size: Vector3Like;
  position: Vector3Like;
  rotation: Vector3Like;
  color: string;
}

export interface MeasurementNode {
  id: string;
  name: string;
  groupId: string | null;
  start: Vector3Like;
  end: Vector3Like;
  color: string;
}

export interface GroupNode {
  id: string;
  name: string;
  parentGroupId: string | null;
}

export interface ProjectDocument {
  id: string;
  name: string;
  version: number;
  unitPreference: UnitPreference;
  snapSettings: SnapSettings;
  cameraState: CameraState;
  groups: GroupNode[];
  parts: PartNode[];
  measurements: MeasurementNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  partCount: number;
}
