import { DEFAULT_OBJECT_COLOR } from "./materials";
import type {
  CladdingProfileId,
  GlassProfileId,
  ObjectProfileId,
  ObjectType,
  PartNode,
  SheetProfileId,
  TimberProfileId,
  Vector3Like,
} from "../types/model";

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

export type CladdingProfile = BaseProfile & {
  id: CladdingProfileId;
  objectType: "cladding";
  widthMm: number;
  heightMm: number;
  defaultLengthMm: number;
  profileAngleDeg: number;
};

export type GlassProfile = BaseProfile & {
  id: GlassProfileId;
  objectType: "glass";
  thicknessMm: number;
  defaultLengthMm: number;
  defaultWidthMm: number;
  opacity: number;
};

export type RectangleProfile = BaseProfile & {
  id: "shape-rectangle";
  objectType: "rectangle";
  defaultWidthMm: number;
  defaultDepthMm: number;
};

export type CircleProfile = BaseProfile & {
  id: "shape-circle";
  objectType: "circle";
  defaultWidthMm: number;
  defaultDepthMm: number;
};

export type ShapeProfile = RectangleProfile | CircleProfile;

export type ObjectProfile = SheetProfile | TimberProfile | CladdingProfile | GlassProfile | ShapeProfile;

export const SHEET_PROFILES: SheetProfile[] = [
  { id: "osb3-12", objectType: "sheet", label: "OSB/3 12 mm", thicknessMm: 12, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-15", objectType: "sheet", label: "OSB/3 15 mm", thicknessMm: 15, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-18", objectType: "sheet", label: "OSB/3 18 mm", thicknessMm: 18, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "osb3-22", objectType: "sheet", label: "OSB/3 22 mm", thicknessMm: 22, defaultLengthMm: 1200, defaultWidthMm: 600, color: DEFAULT_OBJECT_COLOR },
  { id: "plywood-18", objectType: "sheet", label: "Plywood 18 mm", thicknessMm: 18, defaultLengthMm: 1200, defaultWidthMm: 600, color: "#c9a06a" },
];

export const TIMBER_PROFILES: TimberProfile[] = [
  { id: "timber-56x56", objectType: "timber", label: "56 x 56 mm", widthMm: 56, heightMm: 56, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-60x80", objectType: "timber", label: "60 x 80 mm", widthMm: 60, heightMm: 80, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-80x100", objectType: "timber", label: "80 x 100 mm", widthMm: 80, heightMm: 100, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-100x100", objectType: "timber", label: "100 x 100 mm", widthMm: 100, heightMm: 100, defaultLengthMm: 2000, color: "#a77b4e" },
  { id: "timber-120x120", objectType: "timber", label: "120 x 120 mm", widthMm: 120, heightMm: 120, defaultLengthMm: 2000, color: "#a77b4e" },
];

export const CLADDING_PROFILES: CladdingProfile[] = [
  { id: "rhombus-18x68", objectType: "cladding", label: "Rhombus 18 x 68 mm", widthMm: 68, heightMm: 18, defaultLengthMm: 2000, profileAngleDeg: 20, color: "#9a7958" },
  { id: "rhombus-19x68", objectType: "cladding", label: "Rhombus 19 x 68 mm", widthMm: 68, heightMm: 19, defaultLengthMm: 2000, profileAngleDeg: 20, color: "#9a7958" },
  { id: "rhombus-19x95", objectType: "cladding", label: "Rhombus 19 x 95 mm", widthMm: 95, heightMm: 19, defaultLengthMm: 2000, profileAngleDeg: 30, color: "#9a7958" },
  { id: "rhombus-24x68", objectType: "cladding", label: "Rhombus 24 x 68 mm", widthMm: 68, heightMm: 24, defaultLengthMm: 2000, profileAngleDeg: 20, color: "#9a7958" },
  { id: "rhombus-27x68", objectType: "cladding", label: "Rhombus 27 x 68 mm", widthMm: 68, heightMm: 27, defaultLengthMm: 2000, profileAngleDeg: 20, color: "#9a7958" },
];

export const GLASS_PROFILES: GlassProfile[] = [
  { id: "plexiglass-3", objectType: "glass", label: "Plexiglass 3 mm", thicknessMm: 3, defaultLengthMm: 900, defaultWidthMm: 600, opacity: 0.38, color: "#86cfff" },
  { id: "plexiglass-5", objectType: "glass", label: "Plexiglass 5 mm", thicknessMm: 5, defaultLengthMm: 900, defaultWidthMm: 600, opacity: 0.36, color: "#86cfff" },
  { id: "plexiglass-10", objectType: "glass", label: "Plexiglass 10 mm", thicknessMm: 10, defaultLengthMm: 900, defaultWidthMm: 600, opacity: 0.32, color: "#86cfff" },
];

export const SHAPE_PROFILES: ShapeProfile[] = [
  { id: "shape-rectangle", objectType: "rectangle", label: "Rectangle", defaultWidthMm: 800, defaultDepthMm: 500, color: "#7f8a96" },
  { id: "shape-circle", objectType: "circle", label: "Circle", defaultWidthMm: 500, defaultDepthMm: 500, color: "#7f8a96" },
];

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  sheet: "Sheet Goods",
  timber: "Structural Timber",
  cladding: "Rhombus Cladding",
  glass: "Glass",
  rectangle: "Rectangle",
  circle: "Circle",
};

export function getProfilesForType(objectType: ObjectType): ObjectProfile[] {
  if (objectType === "sheet") {
    return SHEET_PROFILES;
  }

  if (objectType === "timber") {
    return TIMBER_PROFILES;
  }

  if (objectType === "cladding") {
    return CLADDING_PROFILES;
  }

  if (objectType === "glass") {
    return GLASS_PROFILES;
  }

  return SHAPE_PROFILES.filter((profile) => profile.objectType === objectType);
}

export function getProfileById(profileId: ObjectProfileId): ObjectProfile {
  const profile = [...SHEET_PROFILES, ...TIMBER_PROFILES, ...CLADDING_PROFILES, ...GLASS_PROFILES, ...SHAPE_PROFILES].find((entry) => entry.id === profileId);
  if (!profile) {
    throw new Error(`Unknown object profile: ${profileId}`);
  }

  return profile;
}

export function getDefaultProfileId(objectType: ObjectType): ObjectProfileId {
  if (objectType === "sheet") {
    return "osb3-18";
  }

  if (objectType === "timber") {
    return "timber-100x100";
  }

  if (objectType === "cladding") {
    return "rhombus-19x68";
  }

  if (objectType === "glass") {
    return "plexiglass-3";
  }

  return objectType === "circle" ? "shape-circle" : "shape-rectangle";
}

export function getObjectTypeLabel(objectType: ObjectType): string {
  return OBJECT_TYPE_LABELS[objectType];
}

export function createSizeFromProfile(profile: ObjectProfile): Vector3Like {
  if (profile.objectType === "sheet" || profile.objectType === "glass") {
    return {
      x: profile.defaultLengthMm,
      y: profile.defaultWidthMm,
      z: profile.thicknessMm,
    };
  }

  if (profile.objectType === "rectangle" || profile.objectType === "circle") {
    return {
      x: profile.defaultWidthMm,
      y: 0,
      z: profile.defaultDepthMm,
    };
  }

  return {
    x: profile.defaultLengthMm,
    y: profile.widthMm,
    z: profile.heightMm,
  };
}

export function applyProfileToSize(profile: ObjectProfile, size: Vector3Like): Vector3Like {
  if (profile.objectType === "sheet" || profile.objectType === "glass") {
    return {
      ...size,
      z: profile.thicknessMm,
    };
  }

  if (profile.objectType === "rectangle") {
    return {
      x: size.x,
      y: 0,
      z: size.z,
    };
  }

  if (profile.objectType === "circle") {
    return {
      x: size.x,
      y: 0,
      z: size.x,
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
  const prefix =
    objectType === "sheet"
      ? "Sheet"
      : objectType === "timber"
        ? "Timber"
        : objectType === "cladding"
          ? "Cladding"
          : objectType === "glass"
            ? "Glass"
            : objectType === "rectangle"
              ? "Rectangle"
              : "Circle";
  return `${prefix} ${index + 1}`;
}

export function isSheetObject(part: PartNode): boolean {
  return part.objectType === "sheet";
}

export function getResizableAxes(part: PartNode): Array<keyof Vector3Like> {
  if (part.objectType === "sheet" || part.objectType === "glass") {
    return ["x", "y"];
  }

  if (part.objectType === "rectangle") {
    return ["x", "z"];
  }

  return ["x"];
}
