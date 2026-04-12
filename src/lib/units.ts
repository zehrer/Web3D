import type { UnitPreference } from "../types/model";

export interface UnitDefinition {
  id: UnitPreference;
  label: string;
  shortLabel: string;
  millimetersPerUnit: number;
}

export const UNIT_DEFINITIONS: Record<UnitPreference, UnitDefinition> = {
  "metric-cm": {
    id: "metric-cm",
    label: "Centimeters",
    shortLabel: "cm",
    millimetersPerUnit: 10,
  },
  "metric-mm": {
    id: "metric-mm",
    label: "Millimeters",
    shortLabel: "mm",
    millimetersPerUnit: 1,
  },
  "imperial-in": {
    id: "imperial-in",
    label: "Inches",
    shortLabel: "in",
    millimetersPerUnit: 25.4,
  },
};

export function toDisplayUnits(valueMm: number, unit: UnitPreference): number {
  return valueMm / UNIT_DEFINITIONS[unit].millimetersPerUnit;
}

export function fromDisplayUnits(value: number, unit: UnitPreference): number {
  return value * UNIT_DEFINITIONS[unit].millimetersPerUnit;
}

export function formatLength(valueMm: number, unit: UnitPreference, digits = 1): string {
  const displayValue = toDisplayUnits(valueMm, unit);
  return `${displayValue.toFixed(digits)} ${UNIT_DEFINITIONS[unit].shortLabel}`;
}

export function clampLength(valueMm: number, min = 1): number {
  return Number.isFinite(valueMm) ? Math.max(min, valueMm) : min;
}
