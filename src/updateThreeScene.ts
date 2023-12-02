import { BattleState } from "./battleState";
import { San, SanKing } from "./san";
import * as geoUtils from "./geoUtils";
import { King, SoldierAnimationKind } from "./battleStateData";

// In this file, we use "b" and "s" prefixes to
// differentiate between the BattleState and San.

export function updateThreeScene(battle: BattleState, san: San): void {
  const { scene, sky, camera, grass } = san.data;
  scene.remove(...scene.children);

  const bAzukiKing = battle.getAzukiKing();
  const bEdamameKing = battle.getEdamameKing();
  const sAzukiKing = san.data.azukiKing;
  const sEdamameKing = san.data.edamameKing;

  scene.add(sky);
  scene.add(grass);

  updateAzukiKing(battle, san);
  updateCamera(battle, san);
}

function updateAzukiKing(battle: BattleState, san: San): void {
  const { scene, sky, camera, grass } = san.data;
  const bAzukiKing = battle.getAzukiKing();
  const bEdamameKing = battle.getEdamameKing();
  const sAzukiKing = san.data.azukiKing;
  const sEdamameKing = san.data.edamameKing;

  updateKingTransform(bAzukiKing, sAzukiKing);
  updateKingAnimation(bAzukiKing, sAzukiKing);
  scene.add(sAzukiKing.gltf.scene);

  updateKingTransform(bEdamameKing, sEdamameKing);
  updateKingAnimation(bEdamameKing, sEdamameKing);
  scene.add(sEdamameKing.gltf.scene);
}

function updateKingTransform(bKing: King, sKing: SanKing): void {
  if (bKing.dragonfly.isBeingRidden) {
    geoUtils.setQuaternionFromOrientation(
      sKing.gltf.scene.quaternion,
      bKing.dragonfly.orientation
    );
  } else {
    geoUtils.setQuaternionFromOrientation(sKing.gltf.scene.quaternion, {
      yaw: bKing.yRot,
      pitch: 0,
      roll: 0,
    });
  }
  sKing.gltf.scene.position.set(...bKing.position);
}

function updateKingAnimation(bKing: King, sKing: SanKing): void {
  if (bKing.animation.kind === SoldierAnimationKind.Walk) {
    sKing.walkAction.play();

    sKing.slashAction.stop();

    sKing.mixer.setTime(bKing.animation.timeInSeconds);
  } else if (bKing.animation.kind === SoldierAnimationKind.Slash) {
    sKing.slashAction.play();

    sKing.walkAction.stop();

    sKing.mixer.setTime(bKing.animation.timeInSeconds);
  } else {
    sKing.walkAction.stop();
    sKing.slashAction.stop();
  }
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
