import { BattleState } from "./battleState";
import { San } from "./san";
import * as geoUtils from "./geoUtils";

export function updateThreeScene(battle: BattleState, san: San): void {
  // We use "b" and "s" prefixes to differentiate between the BattleState
  // and San.
  const { scene, sky, camera, grass } = san.data;
  scene.remove(...scene.children);

  const bAzukiKing = battle.getAzukiKing();
  const bEdamameKing = battle.getEdamameKing();
  const sAzukiKing = san.data.azukiKing;
  const sEdamameKing = san.data.edamameKing;

  scene.add(sky);
  scene.add(grass);

  if (bAzukiKing.dragonfly.isBeingRidden) {
    geoUtils.setQuaternionFromOrientation(
      sAzukiKing.gltf.scene.quaternion,
      bAzukiKing.dragonfly.orientation
    );
  } else {
    geoUtils.setQuaternionFromOrientation(sAzukiKing.gltf.scene.quaternion, {
      yaw: bAzukiKing.yRot,
      pitch: 0,
      roll: 0,
    });
  }
  sAzukiKing.gltf.scene.position.set(...bAzukiKing.position);

  updateCamera(battle, san);
}

function updateCamera(battle: BattleState, san: San): void {
  const { camera } = san.data;

  const bAzukiKing = battle.getAzukiKing();
  const sAzukiKing = san.data.azukiKing;

  if (bAzukiKing.dragonfly.isBeingRidden) {
    camera.position.copy(sAzukiKing.gltf.scene.position);
    camera.quaternion.copy(sAzukiKing.gltf.scene.quaternion);
    camera.translateY(5);
    camera.translateZ(10);
  } else {
    camera.position.copy(sAzukiKing.gltf.scene.position);
    camera.quaternion.copy(sAzukiKing.gltf.scene.quaternion);
    camera.translateY(5);
    camera.translateZ(5);
    camera.rotateX(bAzukiKing.cameraPitch);
  }
}
