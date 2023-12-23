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

export function distance(self: Triple, other: Triple): number {
  return Math.sqrt(distanceToSquared(self, other));
}

export function distanceToSquared(self: Triple, other: Triple): number {
  const [x1, y1, z1] = self;
  const [x2, y2, z2] = other;
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dz = z1 - z2;
  return dx * dx + dy * dy + dz * dz;
}

/** This function only uses the X and Z components of the vectors. */
export function xzDistanceToSquared(self: Triple, other: Triple): number {
  const x1 = self[0];
  const z1 = self[2];
  const x2 = other[0];
  const z2 = other[2];
  const dx = x1 - x2;
  const dz = z1 - z2;
  return dx * dx + dz * dz;
}

export function cloneTriple(x: Triple): Triple {
  return [x[0], x[1], x[2]];
}

export function add(a: Triple, b: Triple): Triple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(minuend: Triple, subtrahend: Triple): Triple {
  return [
    minuend[0] - subtrahend[0],
    minuend[1] - subtrahend[1],
    minuend[2] - subtrahend[2],
  ];
}

export function lengthSquared(a: Triple): number {
  const [x, y, z] = a;
  return x * x + y * y + z * z;
}

export function setTriple(out: Triple, source: Triple): void {
  out[0] = source[0];
  out[1] = source[1];
  out[2] = source[2];
}

export function setOrientation(out: Orientation, source: Orientation): void {
  out.yaw = source.yaw;
  out.pitch = source.pitch;
  out.roll = source.roll;
}

export function cloneOrientation(source: Orientation): Orientation {
  return {
    yaw: source.yaw,
    pitch: source.pitch,
    roll: source.roll,
  };
}

export function rotateAboutYAxis(source: Triple, angle: number): Triple {
  const temp = toThreeVec(source);
  temp.applyAxisAngle(new Vector3(0, 1, 0), angle);
  return fromThreeVec(temp);
}
