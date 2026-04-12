import type { UnitPreference } from "../types/model";

const IMPERIAL_REGIONS = new Set(["US", "LR", "MM"]);

function extractRegion(locale: string): string | null {
  try {
    const normalized = new Intl.Locale(locale);
    return normalized.region ?? null;
  } catch {
    const match = locale.match(/[-_](\w{2})$/);
    return match?.[1]?.toUpperCase() ?? null;
  }
}

export function getDefaultUnitPreference(locales?: readonly string[]): UnitPreference {
  const candidates = locales?.length ? locales : typeof navigator !== "undefined" ? navigator.languages : [];
  const region = candidates.map(extractRegion).find(Boolean);

  if (region && IMPERIAL_REGIONS.has(region)) {
    return "imperial-in";
  }

  return "metric-cm";
}
