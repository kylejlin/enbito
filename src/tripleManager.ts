import { Object3D, Vector3 } from "three";
import { Orientation, Triple } from "./battleStateData";

export class TripleManager {
  constructor(public readonly raw: Triple) {}

  translateZ(orientation: Orientation, amount: number): void {
    const { raw } = this;
    const [x, y, z] = raw;
    const temp = new Object3D();

    temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), orientation.yaw);
    temp.rotateX(orientation.pitch);
    temp.rotateZ(orientation.roll);

    temp.position.set(x, y, z);
    temp.translateZ(amount);

    raw[0] = temp.position.x;
    raw[1] = temp.position.y;
    raw[2] = temp.position.z;
  }

  distanceToSquared(other: Triple): number {
    const [x1, y1, z1] = this.raw;
    const [x2, y2, z2] = other;
    const dx = x1 - x2;
    const dy = y1 - y2;
    const dz = z1 - z2;
    return dx * dx + dy * dy + dz * dz;
  }
}
