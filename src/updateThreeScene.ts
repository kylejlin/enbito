import { BattleState } from "./battleState";
import { GltfCache, San, SanKing } from "./san";
import * as geoUtils from "./geoUtils";
import {
  Allegiance,
  King,
  Orientation,
  SoldierAnimationKind,
  SoldierAnimationState,
  SoldierExplosion,
} from "./battleStateData";
import { InstancedMesh, Object3D, Scene, Vector3 } from "three";
import { add } from "three/examples/jsm/libs/tween.module.js";
import { cloneGltf } from "./cloneGltf";

// In this file, we use "b" and "s" prefixes to
// differentiate between the BattleState and San.

export function updateThreeScene(battle: BattleState, san: San): void {
  const { scene, sky, grass } = san.data;
  scene.remove(...scene.children);

  scene.add(sky);
  scene.add(grass);

  updateAzukiKing(battle, san);
  updateCamera(battle, san);
  updateUnits(battle, san);
  updateBannerTowers(battle, san);
  updateSoldierExplosions(battle, san);
}

function updateAzukiKing(battle: BattleState, san: San): void {
  const { scene } = san.data;
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

function updateUnits(battle: BattleState, san: San): void {
  const {
    scene,
    azukiSpearWalkFrames,
    azukiSpearStabFrames,
    edamameSpearWalkFrames,
    edamameSpearStabFrames,
  } = san.data;

  setCountsToZero(azukiSpearWalkFrames);
  setCountsToZero(azukiSpearStabFrames);
  setCountsToZero(edamameSpearWalkFrames);
  setCountsToZero(edamameSpearStabFrames);

  const temp = new Object3D();

  const { activeUnitIds } = battle.data;
  for (const unitId of activeUnitIds) {
    const bUnit = battle.getUnit(unitId);
    for (const soldierId of bUnit.soldierIds) {
      const bSoldier = battle.getSoldier(soldierId);
      temp.position.set(
        bSoldier.position[0],
        bSoldier.position[1],
        bSoldier.position[2]
      );
      temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), bSoldier.yRot);

      const instancedMesh = getSpearFrameInstancedMesh(
        bSoldier.animation,
        bUnit.allegiance,
        san
      );

      temp.updateMatrix();
      instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
      ++instancedMesh.count;
    }
  }

  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiSpearWalkFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiSpearStabFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameSpearWalkFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameSpearStabFrames,
    scene
  );
}

function setCountsToZero(meshs: InstancedMesh[]): void {
  for (const mesh of meshs) {
    mesh.count = 0;
  }
}

function addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
  meshes: InstancedMesh[],
  scene: Scene
): void {
  for (const mesh of meshes) {
    if (mesh.count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
    }
  }
}

function getSpearFrameInstancedMesh(
  bAnimation: SoldierAnimationState,
  bAllegiance: Allegiance,
  san: San
): InstancedMesh {
  const {
    azukiSpearWalkFrames,
    azukiSpearStabFrames,
    edamameSpearWalkFrames,
    edamameSpearStabFrames,
  } = san.data;
  const { azukiSpearWalkClipDuration, azukiSpearStabClipDuration } =
    san.data.mcon;
  const walkFrameCount = azukiSpearWalkFrames.length;
  const stabFrameCount = azukiSpearStabFrames.length;

  if (bAnimation.kind === SoldierAnimationKind.Walk) {
    const frameNumber = Math.min(
      Math.floor(
        (bAnimation.timeInSeconds / azukiSpearWalkClipDuration) * walkFrameCount
      ),
      walkFrameCount - 1
    );
    return bAllegiance === Allegiance.Azuki
      ? azukiSpearWalkFrames[frameNumber]
      : edamameSpearWalkFrames[frameNumber];
  }

  if (bAnimation.kind === SoldierAnimationKind.Stab) {
    const frameNumber = Math.min(
      Math.floor(
        (bAnimation.timeInSeconds / azukiSpearStabClipDuration) * stabFrameCount
      ),
      stabFrameCount - 1
    );
    return bAllegiance === Allegiance.Azuki
      ? azukiSpearStabFrames[frameNumber]
      : edamameSpearStabFrames[frameNumber];
  }

  if (bAnimation.kind === SoldierAnimationKind.Idle) {
    return bAllegiance === Allegiance.Azuki
      ? azukiSpearWalkFrames[0]
      : edamameSpearWalkFrames[0];
  }

  if (bAnimation.kind === SoldierAnimationKind.Slash) {
    throw new Error("Spearmen cannot slash.");
  }

  // We have to include this line to satisfy the TypeScript compiler.
  // The compiler doesn't recognize this branch as impossible,
  // but it _does_ recognize that `bAnimation.kind` has type `never` in this branch.
  // So, as a workaround, we return `bAnimation.kind`.
  return bAnimation.kind;
}

function updateSoldierExplosions(battle: BattleState, san: San): void {
  const { azukiUnarmedExplosionFrames, edamameUnarmedExplosionFrames, scene } =
    san.data;
  const bSoldierExplosions = battle.data.soldierExplosions;

  setCountsToZero(azukiUnarmedExplosionFrames);
  setCountsToZero(edamameUnarmedExplosionFrames);

  const temp = new Object3D();
  for (const bExplosion of bSoldierExplosions) {
    temp.position.set(
      bExplosion.position[0],
      bExplosion.position[1],
      bExplosion.position[2]
    );
    geoUtils.setQuaternionFromOrientation(
      temp.quaternion,
      bExplosion.orientation
    );

    const instancedMesh = getExplosionFrameInstancedMesh(bExplosion, san);

    temp.updateMatrix();
    instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
    ++instancedMesh.count;
  }

  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiUnarmedExplosionFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameUnarmedExplosionFrames,
    scene
  );
}

function getExplosionFrameInstancedMesh(
  bExplosion: SoldierExplosion,
  san: San
): InstancedMesh {
  const { azukiUnarmedExplosionFrames, edamameUnarmedExplosionFrames } =
    san.data;
  const { soldierExplosionClipDuration } = san.data.mcon;
  const frameCount = azukiUnarmedExplosionFrames.length;

  const frameNumber = Math.min(
    Math.floor(
      (bExplosion.timeInSeconds / soldierExplosionClipDuration) * frameCount
    ),
    frameCount - 1
  );
  return bExplosion.allegiance === Allegiance.Azuki
    ? azukiUnarmedExplosionFrames[frameNumber]
    : edamameUnarmedExplosionFrames[frameNumber];
}

function updateBannerTowers(battle: BattleState, san: San): void {
  const sAzukiTowers = san.data.azukiBannerTowers;
  const sEdamameTowers = san.data.edamameBannerTowers;
  const { scene } = san.data;

  sAzukiTowers.count = 0;
  sEdamameTowers.count = 0;

  const bTowerIds = battle.data.activeTowerIds;
  for (const bTowerId of bTowerIds) {
    const bTower = battle.getBannerTower(bTowerId);
    const sMeshCache = getBannerTowerGltfCache(bTower.allegiance, san);
    writeToGltfCache(
      bTower.position,
      { yaw: 0, pitch: 0, roll: 0 },
      sMeshCache
    );
  }

  addGltfCacheToScene(sAzukiTowers, scene);
  addGltfCacheToScene(sEdamameTowers, scene);
}

function getBannerTowerGltfCache(allegiance: Allegiance, san: San): GltfCache {
  return allegiance === Allegiance.Azuki
    ? san.data.azukiBannerTowers
    : san.data.edamameBannerTowers;
}

function writeToGltfCache(
  position: [number, number, number],
  orientation: Orientation,
  cache: GltfCache
): void {
  const { gltfs, count } = cache;
  while (count >= gltfs.length) {
    gltfs.push(cloneGltf(gltfs[0]));
  }

  const instance = gltfs[count].scene;
  instance.position.set(position[0], position[1], position[2]);
  geoUtils.setQuaternionFromOrientation(instance.quaternion, orientation);
  ++cache.count;
}

function addGltfCacheToScene(meshCache: GltfCache, scene: Scene): void {
  const { gltfs, count } = meshCache;
  for (let i = 0; i < count; ++i) {
    scene.add(gltfs[i].scene);
  }
}
