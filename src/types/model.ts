export type UnitPreference = "metric-cm" | "metric-mm" | "imperial-in";

export type ObjectType = "sheet" | "timber" | "cladding" | "glass" | "rectangle" | "circle";

export type SheetProfileId = "osb3-12" | "osb3-15" | "osb3-18" | "osb3-22" | "plywood-18";

export type TimberProfileId = "timber-56x56" | "timber-60x80" | "timber-80x100" | "timber-100x100" | "timber-120x120";

export type CladdingProfileId = "rhombus-18x68" | "rhombus-19x68" | "rhombus-19x95" | "rhombus-24x68" | "rhombus-27x68";

export type GlassProfileId = "plexiglass-3" | "plexiglass-5" | "plexiglass-10";

export type ShapeProfileId = "shape-rectangle" | "shape-circle";

export type ObjectProfileId = SheetProfileId | TimberProfileId | CladdingProfileId | GlassProfileId | ShapeProfileId;

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
  materialId: string | null;
  size: Vector3Like;
  position: Vector3Like;
  rotation: Vector3Like;
  color: string;
  hidden?: boolean;
}

export interface MeasurementNode {
  id: string;
  name: string;
  groupId: string | null;
  start: Vector3Like;
  end: Vector3Like;
  color: string;
  hidden?: boolean;
}

export interface GroupNode {
  id: string;
  name: string;
  parentGroupId: string | null;
  hidden?: boolean;
}

export interface MaterialGroupNode {
  id: string;
  name: string;
  parentGroupId: string | null;
}

export interface MaterialNode {
  id: string;
  name: string;
  groupId: string | null;
  objectType: ObjectType;
  profileId: ObjectProfileId;
  color: string;
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
  materialGroups: MaterialGroupNode[];
  materials: MaterialNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  partCount: number;
}
