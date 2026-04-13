import { Euler, Vector3 } from "three";
import { snapValue } from "./snap";
import type { PartNode, Vector3Like } from "../types/model";

export function applyResizeFromHandle(
  part: PartNode,
  axis: keyof Vector3Like,
  direction: 1 | -1,
  pixelDelta: number,
  resizeIncrement: number,
  snapEnabled: boolean,
): Pick<PartNode, "size" | "position"> {
  const signedDelta = pixelDelta * 2 * direction;
  const nextSize = Math.max(5, part.size[axis] + signedDelta);
  const snappedSize = snapValue(nextSize, resizeIncrement, snapEnabled);
  const actualDelta = snappedSize - part.size[axis];

  const axisVector = new Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0)
    .applyEuler(new Euler(part.rotation.x, part.rotation.y, part.rotation.z))
    .normalize();

  return {
    size: {
      ...part.size,
      [axis]: snappedSize,
    },
    position: {
      x: part.position.x + (direction === -1 ? axisVector.x * -actualDelta : 0),
      y: part.position.y + (direction === -1 ? axisVector.y * -actualDelta : 0),
      z: part.position.z + (direction === -1 ? axisVector.z * -actualDelta : 0),
    },
  };
}
