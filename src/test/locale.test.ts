import { describe, expect, it } from "vitest";
import { getDefaultUnitPreference } from "../lib/locale";

describe("locale unit defaults", () => {
  it("defaults to imperial for US locales", () => {
    expect(getDefaultUnitPreference(["en-US"])).toBe("imperial-in");
  });

  it("defaults to metric for German locales", () => {
    expect(getDefaultUnitPreference(["de-DE"])).toBe("metric-cm");
  });

  it("falls back to metric when region is ambiguous", () => {
    expect(getDefaultUnitPreference(["en"])).toBe("metric-cm");
  });
});
