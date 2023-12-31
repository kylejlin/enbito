import { BattleState } from "../battleState";
import { GltfCache, San, SanKing } from "../san";
import * as geoUtils from "../geoUtils";
import {
  Allegiance,
  Dragonfly,
  DragonflyAnimationKind,
  King,
  PendingCommandKind,
  PlannedDeploymentKind,
  Soldier,
  SoldierAnimationKind,
  SoldierAnimationState,
  SoldierExplosion,
} from "../battleStateData";
import {
  AnimationClip,
  AnimationMixer,
  InstancedMesh,
  Object3D,
  Raycaster,
  Vector3,
} from "three";
import { cloneGltf } from "../cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  getAzukiKingDistanceSquaredToNearestBannerTower,
  getEdamameKingDistanceSquaredToNearestBannerTower,
  getNearestBannerTowerId,
  getPlannedDeploymentUnitBasedOnPlannedDeploymentStart,
  getTentativeWheelInfo,
  getTentativelySelectedAzukiUnitId,
  isAzukiBannerTower,
} from "../tick";
import {
  BANNERTOWER_SAFEZONE_WARNING_RANGE_SQUARED,
  FLASHING_BLUE_CYLINDER_RADIUS,
  MIN_PATROL_RADIUS,
} from "../gameConsts";
import { getGroundCursorPosition } from "../groundCursor";

// In this file, we use "b" and "s" prefixes to
// differentiate between the BattleState and San.

export function main(battle: BattleState, san: San): void {
  const { scene, sky, grass, ambientLight } = san.data;

  scene.add(sky);
  scene.add(grass);
  scene.add(ambientLight);

  updateKings(battle, san);
  updateDragonflies(battle, san);
  updateCamera(battle, san);
  updatePlannedDeploymentUnit(battle, san);
  updateUnits(battle, san);
  updateBannerTowers(battle, san);
  updateSoldierExplosions(battle, san);
  updateTentativelySelectedDeploymentBannerTowerMarker(battle, san);
  updateTentativelySelectedUnitMarkers(battle, san);
  updateTentativeWheelDestination(battle, san);
  updateFlashingMaterialOpacity(battle, san);
  updateTentativelySelectedRetreatDestinationBannerTowerMarker(battle, san);
  updateTentativePatrolAreaMarker(battle, san);

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
  if (!bAzukiKing.hasExploded) {
    scene.add(sAzukiKing.gltf.scene);
  }

  updateKingTransform(bEdamameKing, sEdamameKing, battle);
  updateKingAnimation(bEdamameKing, sEdamameKing);
  if (!bEdamameKing.hasExploded) {
    scene.add(sEdamameKing.gltf.scene);
  }
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

function updateDragonflies(battle: BattleState, san: San): void {
  const sDragonflies = san.data.dragonflies;
  for (const id of battle.data.activeDragonflyIds) {
    const bDragonfly = battle.getDragonfly(id);
    const sDragonflyGltf = getInstanceSceneFromGltfCache(sDragonflies);
    const sDragonfly = sDragonflyGltf.scene;
    sDragonfly.position.set(...bDragonfly.position);
    geoUtils.setQuaternionFromOrientation(
      sDragonfly.quaternion,
      bDragonfly.orientation
    );
    sDragonfly.scale.setScalar(0.6);

    updateDragonflyAnimationMixer(bDragonfly, sDragonflyGltf);
  }
}

function updateDragonflyAnimationMixer(
  bDragonfly: Dragonfly,
  sDragonflyGltf: GLTF
): void {
  const sDragonfly = sDragonflyGltf.scene;
  const dragonflyMixer = new AnimationMixer(sDragonfly);

  if (bDragonfly.animation.kind === DragonflyAnimationKind.Fly) {
    const flyClip = AnimationClip.findByName(sDragonflyGltf.animations, "Fly");
    const dragonflyFlyAction = dragonflyMixer.clipAction(flyClip);
    dragonflyFlyAction.play();
    dragonflyMixer.setTime(bDragonfly.animation.timeInSeconds);
  } else if (bDragonfly.animation.kind === DragonflyAnimationKind.Idle) {
    // The idle pose is just the resting pose of the Fly animation.
    const flyClip = AnimationClip.findByName(sDragonflyGltf.animations, "Fly");
    const dragonflyFlyAction = dragonflyMixer.clipAction(flyClip);
    dragonflyFlyAction.play();
    dragonflyMixer.setTime(0);
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

  const tentativelySelectedUnitId = getTentativelySelectedAzukiUnitId(
    battle,
    san
  );

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

    if (bUnit.isSelected && unitId !== tentativelySelectedUnitId) {
      for (const soldierId of bUnit.soldierIds) {
        const bSoldier = battle.getSoldier(soldierId);
        updateSelectedSoldierMarker(bSoldier, san);
      }
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

function updateSelectedSoldierMarker(bSoldier: Soldier, san: San): void {
  const instancedMesh = san.data.blueSphere;
  const temp = new Object3D();
  temp.position.set(...bSoldier.position);
  geoUtils.setQuaternionFromOrientation(temp.quaternion, bSoldier.orientation);
  temp.translateY(1);

  temp.updateMatrix();
  instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
  ++instancedMesh.count;
}

function updateSoldierExplosions(battle: BattleState, san: San): void {
  const bSoldierExplosions = battle.data.soldierExplosions;

  const temp = new Object3D();
  for (const bExplosion of bSoldierExplosions) {
    temp.position.set(...bExplosion.position);
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
    const sTower = getInstanceSceneFromGltfCache(sMeshCache).scene;
    sTower.position.set(...bTower.position);
    geoUtils.setQuaternionFromOrientation(sTower.quaternion, {
      yaw: 0,
      pitch: 0,
      roll: 0,
    });
  }

  updateBannerTowerSafezoneMarkers(battle, san);
}

function getBannerTowerGltfCache(allegiance: Allegiance, san: San): GltfCache {
  return allegiance === Allegiance.Azuki
    ? san.data.azukiBannerTowers
    : san.data.edamameBannerTowers;
}

function getInstanceSceneFromGltfCache(cache: GltfCache): GLTF {
  const { gltfs, count } = cache;
  while (count >= gltfs.length) {
    gltfs.push(cloneGltf(gltfs[0]));
  }

  const instance = gltfs[count];
  ++cache.count;
  return instance;
}

function updateBannerTowerSafezoneMarkers(battle: BattleState, san: San): void {
  const bTowerIds = battle.data.activeTowerIds;
  const shouldWarnAzuki =
    getAzukiKingDistanceSquaredToNearestBannerTower(battle) >=
    BANNERTOWER_SAFEZONE_WARNING_RANGE_SQUARED;
  const shouldWarnEdamame =
    getEdamameKingDistanceSquaredToNearestBannerTower(battle) >=
    BANNERTOWER_SAFEZONE_WARNING_RANGE_SQUARED;
  const azukiKing = battle.getAzukiKing();
  const sortedBannerTowers = bTowerIds
    .map((id) => battle.getBannerTower(id))
    .sort((a, b) => {
      const aDistSq = geoUtils.distanceToSquared(
        azukiKing.position,
        a.position
      );
      const bDistSq = geoUtils.distanceToSquared(
        azukiKing.position,
        b.position
      );
      return aDistSq - bDistSq;
    });
  const temp = new Object3D();
  for (let i = 0; i < sortedBannerTowers.length; ++i) {
    const bTower = sortedBannerTowers[i];
    const shouldShow =
      bTower.allegiance === Allegiance.Azuki
        ? shouldWarnAzuki
        : shouldWarnEdamame;
    if (!shouldShow) {
      continue;
    }

    const instancedMesh = getSafezoneInstancedMesh(bTower.allegiance, san);
    temp.position.set(bTower.position[0], -0.3 + 0.05 * i, bTower.position[2]);

    temp.updateMatrix();
    instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
    ++instancedMesh.count;
  }
}

function getSafezoneInstancedMesh(
  allegiance: Allegiance,
  san: San
): InstancedMesh {
  return allegiance === Allegiance.Azuki
    ? san.data.azukiSafezoneMarker
    : san.data.edamameSafezoneMarker;
}

function updateCursor(battle: BattleState, san: San): void {
  const { camera, grass, scene } = san.data;
  const sGroundCursor = san.data.groundCursor;
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
  sGroundCursor.scene.position.copy(groundCursorPosition);
  sGroundCursor.scene.quaternion.setFromAxisAngle(
    new Vector3(0, 1, 0),
    battle.getAzukiKing().orientation.yaw
  );
  scene.add(sGroundCursor.scene);

  const { flashingBlueSphere } = san.data;
  const temp = new Object3D();
  temp.position.copy(sGroundCursor.scene.position);
  temp.quaternion.copy(sGroundCursor.scene.quaternion);
  temp.translateY(1);

  temp.updateMatrix();
  flashingBlueSphere.setMatrixAt(flashingBlueSphere.count, temp.matrix);
  ++flashingBlueSphere.count;
}

function updateTentativelySelectedDeploymentBannerTowerMarker(
  battle: BattleState,
  san: San
): void {
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind !== PendingCommandKind.Deploy) {
    return;
  }

  const { plannedDeployment } = pendingCommand;
  if (plannedDeployment.kind !== PlannedDeploymentKind.WithPlannedUnit) {
    return;
  }

  const groundCursorPosition = getGroundCursorPosition(san);
  if (groundCursorPosition === null) {
    return;
  }

  const nearestAzukiTowerId = getNearestBannerTowerId(
    geoUtils.fromThreeVec(groundCursorPosition),
    battle,
    isAzukiBannerTower
  );
  if (nearestAzukiTowerId === null) {
    return;
  }
  const bNearestAzukiTower = battle.getBannerTower(nearestAzukiTowerId);

  const sMarker = san.data.flashingBlueCylinder;
  sMarker.position.set(...bNearestAzukiTower.position);
  sMarker.scale.setScalar(1);
  san.data.scene.add(sMarker);
}

function updateTentativelySelectedUnitMarkers(
  battle: BattleState,
  san: San
): void {
  const tentativelySelectedUnitId = getTentativelySelectedAzukiUnitId(
    battle,
    san
  );
  if (tentativelySelectedUnitId === null) {
    return;
  }
  const bUnit = battle.getUnit(tentativelySelectedUnitId);

  const instancedMesh = san.data.flashingBlueSphere;
  const temp = new Object3D();

  for (const soldierId of bUnit.soldierIds) {
    const bSoldier = battle.getSoldier(soldierId);
    temp.position.set(...bSoldier.position);
    geoUtils.setQuaternionFromOrientation(
      temp.quaternion,
      bSoldier.orientation
    );
    temp.translateY(1);

    temp.updateMatrix();
    instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
    ++instancedMesh.count;
  }
}

/** You must only call this after you call `updateCamera()`. */
function updatePlannedDeploymentUnit(battle: BattleState, san: San): void {
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind !== PendingCommandKind.Deploy) {
    return;
  }

  const { plannedDeployment } = pendingCommand;

  const bPlannedUnit =
    plannedDeployment.kind === PlannedDeploymentKind.WithPlannedUnit
      ? plannedDeployment.plannedUnit
      : getPlannedDeploymentUnitBasedOnPlannedDeploymentStart(battle, san);
  if (bPlannedUnit === null) {
    return;
  }

  const temp = new Object3D();
  for (const bSoldier of bPlannedUnit.soldiers) {
    temp.position.set(...bSoldier.position);
    temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), bSoldier.yRot);

    const soldierInstancedMesh = san.data.azukiSpearWalkFrames[0];

    temp.updateMatrix();
    soldierInstancedMesh.setMatrixAt(soldierInstancedMesh.count, temp.matrix);
    ++soldierInstancedMesh.count;

    temp.translateY(1);

    const markerInstancedMesh = san.data.flashingBlueSphere;

    temp.updateMatrix();
    markerInstancedMesh.setMatrixAt(markerInstancedMesh.count, temp.matrix);
    ++markerInstancedMesh.count;
  }
}

function updateTentativeWheelDestination(battle: BattleState, san: San): void {
  const info = getTentativeWheelInfo(battle, san);
  if (info === null) {
    return;
  }

  const { originalGroundCursorPosition } = info;
  const { flashingBlueCylinder, scene } = san.data;
  flashingBlueCylinder.position.set(
    originalGroundCursorPosition[0],
    0,
    originalGroundCursorPosition[2]
  );
  flashingBlueCylinder.scale.set(0.1, 1, 0.1);
  scene.add(flashingBlueCylinder);

  const wheeledSoldierPosRots = info.soldierTransforms;
  const flashingBlueSphere = san.data.flashingBlueSphere;
  const tentativeSoldier = san.data.azukiSpearStabFrames[0];
  const temp = new Object3D();

  const { activeUnitIds } = battle.data;
  for (const unitId of activeUnitIds) {
    const bUnit = battle.getUnit(unitId);
    if (!(bUnit.allegiance === Allegiance.Azuki && bUnit.isSelected)) {
      continue;
    }

    const { soldierIds } = bUnit;
    for (const soldierId of soldierIds) {
      const [tentativePosition, tentativeOrientation] =
        wheeledSoldierPosRots[soldierId.value];
      temp.position.set(...tentativePosition);
      geoUtils.setQuaternionFromOrientation(
        temp.quaternion,
        tentativeOrientation
      );

      temp.updateMatrix();
      tentativeSoldier.setMatrixAt(tentativeSoldier.count, temp.matrix);
      ++tentativeSoldier.count;

      temp.translateY(1);

      temp.updateMatrix();
      flashingBlueSphere.setMatrixAt(flashingBlueSphere.count, temp.matrix);
      ++flashingBlueSphere.count;
    }
  }

  // TODO
}

function updateFlashingMaterialOpacity(_battle: BattleState, san: San): void {
  const { flashingBlueCylinder, flashingBlueSphere } = san.data;
  const flashingOpacity = 0.25 + 0.1 * Math.sin(Date.now() * 8e-3);
  flashingBlueCylinder.material.opacity = flashingOpacity;
  flashingBlueSphere.material.opacity = flashingOpacity;
}

function updateTentativelySelectedRetreatDestinationBannerTowerMarker(
  battle: BattleState,
  san: San
): void {
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind !== PendingCommandKind.Retreat) {
    return;
  }

  const groundCursorPosition = getGroundCursorPosition(san);
  if (groundCursorPosition === null) {
    return;
  }

  const nearestAzukiTowerId = getNearestBannerTowerId(
    geoUtils.fromThreeVec(groundCursorPosition),
    battle,
    isAzukiBannerTower
  );
  if (nearestAzukiTowerId === null) {
    return;
  }
  const bNearestAzukiTower = battle.getBannerTower(nearestAzukiTowerId);

  const sMarker = san.data.flashingBlueCylinder;
  sMarker.position.set(...bNearestAzukiTower.position);
  sMarker.scale.setScalar(1);
  san.data.scene.add(sMarker);
}

function updateTentativePatrolAreaMarker(battle: BattleState, san: San): void {
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind !== PendingCommandKind.Patrol) {
    return;
  }

  const groundCursorPosition = getGroundCursorPosition(san);
  if (groundCursorPosition === null) {
    return;
  }

  const center = pendingCommand.center;
  const radius = Math.max(
    MIN_PATROL_RADIUS,
    geoUtils.distanceTo(geoUtils.fromThreeVec(groundCursorPosition), center)
  );

  const sMarker = san.data.flashingBlueCylinder;
  sMarker.position.set(...center);
  sMarker.scale.set(
    radius / FLASHING_BLUE_CYLINDER_RADIUS,
    1,
    radius / FLASHING_BLUE_CYLINDER_RADIUS
  );
  san.data.scene.add(sMarker);
}
