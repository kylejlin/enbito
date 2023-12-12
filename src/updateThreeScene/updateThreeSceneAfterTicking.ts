import { BattleState } from "../battleState";
import { GltfCache, San, SanKing } from "../san";
import * as geoUtils from "../geoUtils";
import {
  Allegiance,
  King,
  Orientation,
  SoldierAnimationKind,
  SoldierAnimationState,
  SoldierExplosion,
} from "../battleStateData";
import { InstancedMesh, Object3D, Raycaster, Vector3 } from "three";
import { cloneGltf } from "../cloneGltf";

// In this file, we use "b" and "s" prefixes to
// differentiate between the BattleState and San.

export function updateThreeSceneAfterTicking(
  battle: BattleState,
  san: San
): void {
  const { scene, sky, grass } = san.data;

  scene.add(sky);
  scene.add(grass);

  updateKings(battle, san);
  updateKingDragonflies(battle, san);
  updateCamera(battle, san);
  updateUnits(battle, san);
  updateBannerTowers(battle, san);
  updateSoldierExplosions(battle, san);

  updateCursor(battle, san);
}

function updateKings(battle: BattleState, san: San): void {
  const { scene } = san.data;
  const bAzukiKing = battle.getAzukiKing();
  const bEdamameKing = battle.getEdamameKing();
  const sAzukiKing = san.data.azukiKing;
  const sEdamameKing = san.data.edamameKing;

  updateKingTransform(bAzukiKing, sAzukiKing, battle);
  updateKingAnimation(bAzukiKing, sAzukiKing);
  scene.add(sAzukiKing.gltf.scene);

  updateKingTransform(bEdamameKing, sEdamameKing, battle);
  updateKingAnimation(bEdamameKing, sEdamameKing);
  scene.add(sEdamameKing.gltf.scene);
}

function updateKingTransform(
  bKing: King,
  sKing: SanKing,
  battle: BattleState
): void {
  if (bKing.dragonflyId !== null) {
    const bDragonfly = battle.getDragonfly(bKing.dragonflyId);
    geoUtils.setQuaternionFromOrientation(
      sKing.gltf.scene.quaternion,
      bDragonfly.orientation
    );
  } else {
    geoUtils.setQuaternionFromOrientation(
      sKing.gltf.scene.quaternion,
      bKing.orientation
    );
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

function updateKingDragonflies(battle: BattleState, san: San): void {
  const { dragonflies } = san.data;
  const bAzukiKing = battle.getAzukiKing();
  const bEdamameKing = battle.getEdamameKing();

  if (bAzukiKing.dragonflyId !== null) {
    const bDragonfly = battle.getDragonfly(bAzukiKing.dragonflyId);
    writeToGltfCacheWithScale(
      bDragonfly.position,
      bDragonfly.orientation,
      0.6,
      dragonflies
    );
  }

  if (bEdamameKing.dragonflyId !== null) {
    const bDragonfly = battle.getDragonfly(bEdamameKing.dragonflyId);
    writeToGltfCacheWithScale(
      bDragonfly.position,
      bDragonfly.orientation,
      0.6,
      dragonflies
    );
  }
}

function updateCamera(battle: BattleState, san: San): void {
  const { camera } = san.data;
  const bAzukiKing = battle.getAzukiKing();
  const sAzukiKing = san.data.azukiKing;

  if (bAzukiKing.dragonflyId !== null) {
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
      temp.quaternion.setFromAxisAngle(
        new Vector3(0, 1, 0),
        bSoldier.orientation.yaw
      );

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
    const frameNumber = Math.max(
      0,
      Math.min(
        Math.floor(
          (bAnimation.timeInSeconds / azukiSpearWalkClipDuration) *
            walkFrameCount
        ),
        walkFrameCount - 1
      )
    );
    return bAllegiance === Allegiance.Azuki
      ? azukiSpearWalkFrames[frameNumber]
      : edamameSpearWalkFrames[frameNumber];
  }

  if (bAnimation.kind === SoldierAnimationKind.Stab) {
    const frameNumber = Math.max(
      0,
      Math.min(
        Math.floor(
          (bAnimation.timeInSeconds / azukiSpearStabClipDuration) *
            stabFrameCount
        ),
        stabFrameCount - 1
      )
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
  const bSoldierExplosions = battle.data.soldierExplosions;

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

function writeToGltfCacheWithScale(
  position: [number, number, number],
  orientation: Orientation,
  scale: number,
  cache: GltfCache
): void {
  const { gltfs, count } = cache;
  while (count >= gltfs.length) {
    gltfs.push(cloneGltf(gltfs[0]));
  }

  const instance = gltfs[count].scene;
  instance.position.set(position[0], position[1], position[2]);
  geoUtils.setQuaternionFromOrientation(instance.quaternion, orientation);
  instance.scale.setScalar(scale);
  ++cache.count;
}

function updateCursor(battle: BattleState, san: San): void {
  const { camera, grass, groundCursor, scene } = san.data;
  const raycaster = new Raycaster();
  raycaster.set(
    camera.position,
    new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  );
  const hits = raycaster.intersectObject(grass, true);
  if (hits.length === 0) {
    return;
  }

  const groundCursorPosition = hits[0].point;
  groundCursor.scene.position.copy(groundCursorPosition);
  groundCursor.scene.quaternion.setFromAxisAngle(
    new Vector3(0, 1, 0),
    battle.getAzukiKing().orientation.yaw
  );
  scene.add(groundCursor.scene);
}
