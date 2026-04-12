import { describe, expect, it } from "vitest";
import { fromDisplayUnits, formatLength, toDisplayUnits } from "../lib/units";

describe("unit conversion", () => {
  it("converts millimeters to centimeters and back", () => {
    expect(toDisplayUnits(250, "metric-cm")).toBe(25);
    expect(fromDisplayUnits(25, "metric-cm")).toBe(250);
  });

  it("converts millimeters to inches and back", () => {
    expect(toDisplayUnits(254, "imperial-in")).toBeCloseTo(10);
    expect(fromDisplayUnits(10, "imperial-in")).toBeCloseTo(254);
  });

  it("formats lengths with unit labels", () => {
    expect(formatLength(600, "metric-cm")).toBe("60.0 cm");
  });
});
