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
}
