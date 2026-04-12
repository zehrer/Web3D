export function snapValue(value: number, increment: number, enabled: boolean): number {
  if (!enabled || increment <= 0) {
    return value;
  }

  return Math.round(value / increment) * increment;
}

export function toRadians(valueDeg: number): number {
  return (valueDeg * Math.PI) / 180;
}
