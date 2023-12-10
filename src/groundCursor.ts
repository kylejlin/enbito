import { Raycaster, Vector3 } from "three";
import { San } from "./san";

export function getGroundCursorPosition(san: San): null | Vector3 {
  const { camera, grass } = san.data;
  const raycaster = new Raycaster();
  raycaster.set(
    camera.position,
    new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  );
  const hits = raycaster.intersectObject(grass, true);
  if (hits.length === 0) {
    return null;
  }

  return hits[0].point;
}
