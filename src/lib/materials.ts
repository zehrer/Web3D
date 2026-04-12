import type { MaterialKind, ThicknessPreset } from "../types/model";

export const MATERIAL_LABELS: Record<MaterialKind, string> = {
  pine: "Pine",
  oak: "Oak",
  plywood: "Plywood",
  mdf: "MDF",
  generic: "Generic",
};

export const MATERIAL_COLORS: Record<MaterialKind, string> = {
  pine: "#d9bc7d",
  oak: "#a57648",
  plywood: "#d1a56e",
  mdf: "#bca48a",
  generic: "#9ea7b3",
};

export const THICKNESS_PRESETS: Array<{
  id: ThicknessPreset;
  label: string;
  thicknessMm: number;
}> = [
  { id: "board-18mm", label: "Board 18 mm", thicknessMm: 18 },
  { id: "board-24mm", label: "Board 24 mm", thicknessMm: 24 },
  { id: "sheet-12mm", label: "Sheet 12 mm", thicknessMm: 12 },
  { id: "sheet-18mm", label: "Sheet 18 mm", thicknessMm: 18 },
  { id: "custom", label: "Custom", thicknessMm: 18 },
];

export function getThicknessPresetValue(preset: ThicknessPreset): number {
  return THICKNESS_PRESETS.find((item) => item.id === preset)?.thicknessMm ?? 18;
}
