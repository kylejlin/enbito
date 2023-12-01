import { Object3D, Quaternion, Vector3 } from "three";
import { Orientation, Triple } from "./battleStateData";

export function toThreeVec([x, y, z]: Triple): Vector3 {
  return new Vector3(x, y, z);
}

export function fromThreeVec({ x, y, z }: Vector3): Triple {
  return [x, y, z];
}

export function setQuaternionFromOrientation(
  quaternion: Quaternion,
  orientation: Orientation
): void {
  const temp = new Object3D();
  temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), orientation.yaw);
  temp.rotateX(orientation.pitch);
  temp.rotateZ(orientation.roll);
  quaternion.copy(temp.quaternion);
}

export function translateZ(
  out: Triple,
  orientation: Orientation,
  amount: number
): void {
  const [x, y, z] = out;
  const temp = new Object3D();

  temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), orientation.yaw);
  temp.rotateX(orientation.pitch);
  temp.rotateZ(orientation.roll);

  temp.position.set(x, y, z);
  temp.translateZ(amount);

  out[0] = temp.position.x;
  out[1] = temp.position.y;
  out[2] = temp.position.z;
}

export function distanceToSquared(self: Triple, other: Triple): number {
  const [x1, y1, z1] = self;
  const [x2, y2, z2] = other;
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dz = z1 - z2;
  return dx * dx + dy * dy + dz * dz;
}

export function cloneTriple(x: Triple): Triple {
  return [x[0], x[1], x[2]];
}
