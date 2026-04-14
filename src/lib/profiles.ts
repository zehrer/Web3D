import { DEFAULT_OBJECT_COLOR } from "./materials";
import type { ObjectProfileId, ObjectType, PartNode, SheetProfileId, TimberProfileId, Vector3Like } from "../types/model";

type BaseProfile = {
  id: ObjectProfileId;
  objectType: ObjectType;
  label: string;
  color: string;
};

export type SheetProfile = BaseProfile & {
  id: SheetProfileId;
  objectType: "sheet";
  thicknessMm: number;
  defaultLengthMm: number;
  defaultWidthMm: number;
};

export type TimberProfile = BaseProfile & {
  id: TimberProfileId;
  objectType: "timber";
  widthMm: number;
  heightMm: number;
  defaultLengthMm: number;
};

export type ObjectProfile = SheetProfile | TimberProfile;

export const SHEET_PROFILES: SheetProfile[] = [
  { id: "osb3-12", objectType: "sheet", label: "OSB/3 12 mm", thicknessMm: 12, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-15", objectType: "sheet", label: "OSB/3 15 mm", thicknessMm: 15, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-18", objectType: "sheet", label: "OSB/3 18 mm", thicknessMm: 18, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-22", objectType: "sheet", label: "OSB/3 22 mm", thicknessMm: 22, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "plywood-18", objectType: "sheet", label: "Plywood 18 mm", thicknessMm: 18, defaultLengthMm: 1200, defaultWidthMm: 600, color: "#c9a06a" },
];

export const TIMBER_PROFILES: TimberProfile[] = [
  { id: "timber-60x80", objectType: "timber", label: "60 x 80 mm", widthMm: 60, heightMm: 80, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-80x100", objectType: "timber", label: "80 x 100 mm", widthMm: 80, heightMm: 100, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-100x100", objectType: "timber", label: "100 x 100 mm", widthMm: 100, heightMm: 100, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-120x120", objectType: "timber", label: "120 x 120 mm", widthMm: 120, heightMm: 120, defaultLengthMm: 2000, color: "#a77b4e" },
];

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  sheet: "Sheet Goods",
  timber: "Structural Timber",
};

export function getProfilesForType(objectType: ObjectType): ObjectProfile[] {
  return objectType === "sheet" ? SHEET_PROFILES : TIMBER_PROFILES;
}

export function getProfileById(profileId: ObjectProfileId): ObjectProfile {
  const profile = [...SHEET_PROFILES, ...TIMBER_PROFILES].find((entry) => entry.id === profileId);
  if (!profile) {
    throw new Error(`Unknown object profile: ${profileId}`);
  }

  return profile;
}

export function getDefaultProfileId(objectType: ObjectType): ObjectProfileId {
  return objectType === "sheet" ? "osb3-18" : "timber-100x100";
}

export function getObjectTypeLabel(objectType: ObjectType): string {
  return OBJECT_TYPE_LABELS[objectType];
}

export function createSizeFromProfile(profile: ObjectProfile): Vector3Like {
  if (profile.objectType === "sheet") {
    return {
      x: profile.defaultLengthMm,
      y: profile.defaultWidthMm,
      z: profile.thicknessMm,
    };
  }

  return {
    x: profile.defaultLengthMm,
    y: profile.widthMm,
    z: profile.heightMm,
  };
}

export function applyProfileToSize(profile: ObjectProfile, size: Vector3Like): Vector3Like {
  if (profile.objectType === "sheet") {
    return {
      ...size,
      z: profile.thicknessMm,
    };
  }

  return {
    x: size.x,
    y: profile.widthMm,
    z: profile.heightMm,
  };
}

export function getProfileLabel(profileId: ObjectProfileId): string {
  return getProfileById(profileId).label;
}

export function createObjectName(objectType: ObjectType, index: number): string {
  return `${objectType === "sheet" ? "Sheet" : "Timber"} ${index + 1}`;
}

export function isSheetObject(part: PartNode): boolean {
  return part.objectType === "sheet";
}

export function getResizableAxes(part: PartNode): Array<keyof Vector3Like> {
  return part.objectType === "sheet" ? ["x", "y"] : ["x"];
}
