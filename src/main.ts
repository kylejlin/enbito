import { Assets, ModelConstants } from "./assets";
import {
  Vector3,
  WebGLCubeRenderTarget,
  HalfFloatType,
  AnimationMixer,
  AnimationClip,
  AmbientLight,
} from "three";
import { cloneGltf } from "./cloneGltf";
import {
  AdvanceOrder,
  Allegiance,
  AssembleOrder,
  Dragonfly,
  DragonflyAnimationKind,
  DragonflyFlightKind,
  Orientation,
  PlannedSoldier,
  PlannedUnit,
  Ref,
  Soldier,
  SoldierAnimationKind,
  SoldierAnimationState,
  SoldierExplosion,
  StormOrder,
  Triple,
  Unit,
  UnitOrderKind,
} from "./battleStateData";
import { San, getDefaultSanData } from "./san";
import { BattleState } from "./battleState";
import { getDefaultBattleState } from "./getBattleState";
import * as geoUtils from "./geoUtils";
import { updateThreeSceneAfterTicking } from "./updateThreeScene/updateThreeSceneAfterTicking";
import { updateThreeSceneAfterPlannedDeployment } from "./updateThreeScene/updateThreeSceneAfterPlannedDeployment";
import { resetThreeScene } from "./updateThreeScene/resetThreeScene";
import { addInstancedMeshesToSceneAndFlagForUpdate } from "./updateThreeScene/addInstancedMeshesToSceneAndFlagForUpdate";
import { getGroundCursorPosition } from "./groundCursor";

interface Resources {
  assets: Assets;

  mouse: MouseState;
  keys: KeySet;

  battle: BattleState;

  san: San;
}

interface MouseState {
  /** Left edge is 0, right edge is 1. */
  x: number;
  /** Top edge is 0, bottom edge is 1. */
  y: number;
  isLocked: boolean;
}

interface KeySet {
  w: boolean;
  f: boolean;
  t: boolean;
  g: boolean;
  r: boolean;
  v: boolean;
  space: boolean;
  _1: boolean;
}

const TURN_SPEED_RAD_PER_SEC = Math.PI * 0.5;
const SPEAR_ATTACK_RANGE_SQUARED = 8 ** 2;
const STAB_DAMAGE = 60;
const STAB_COOLDOWN = 1;
const SLASH_DAMAGE = 40;
const SOLDIER_DEPLOYMENT_DELAY_SECONDS = 1;
const ASSEMBLING_TROOP_SPEEDUP_FACTOR = 2;
const MAX_LANDING_SPEED = 30;
const DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED = 5 ** 2;
const DRAGONFLY_MIN_SPEED = 5;
const STAB_TIME_SCALE = 2;
const MAX_STAB_DELAY = 1;

let hasAlerted = false;
function alertOnceAfterDelay(message: string): void {
  if (!hasAlerted) {
    hasAlerted = true;
    setTimeout(() => alert(message), 2e3);
  }
}

export function main(assets: Assets): void {
  const san = new San(getDefaultSanData(assets));

  let worldTime = Date.now();
  let lastWorldTime = worldTime;
  const MILLISECS_PER_TICK = 10;

  const mouse: MouseState = { x: 0.5, y: 0.5, isLocked: false };
  document.addEventListener("pointerlockchange", () => {
    mouse.isLocked = !!document.pointerLockElement;
  });
  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  window.addEventListener("mousemove", (e) => {
    if (mouse.isLocked) {
      mouse.x += e.movementX / window.innerWidth;
      mouse.y += e.movementY / window.innerHeight;

      if (mouse.y < 0) {
        mouse.y = 0;
      }
      if (mouse.y > 1) {
        mouse.y = 1;
      }

      if (resources.battle.getAzukiKing().dragonflyId !== null) {
        if (mouse.x < 0) {
          mouse.x = 0;
        }
        if (mouse.x > 1) {
          mouse.x = 1;
        }
      }
    }
  });

  const keys: KeySet = {
    w: false,
    f: false,
    t: false,
    g: false,
    r: false,
    v: false,
    space: false,
    _1: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
    if (e.key === "f") {
      keys.f = true;
    }
    if (e.key === "t") {
      keys.t = true;
    }
    if (e.key === "g") {
      keys.g = true;
    }
    if (e.key === "r") {
      keys.r = true;
    }
    if (e.key === "v") {
      keys.v = true;
    }
    if (e.key === " ") {
      keys.space = true;
    }
    if (e.key === "1") {
      const wasKey1Down = keys._1;
      keys._1 = true;
      trySetDeploymentStart(wasKey1Down);
      // switch cursor type to spear
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
    if (e.key === "f") {
      keys.f = false;
    }
    if (e.key === "t") {
      keys.t = false;
    }
    if (e.key === "g") {
      keys.g = false;
    }
    if (e.key === "r") {
      keys.r = false;
    }
    if (e.key === "v") {
      keys.v = false;
    }
    if (e.key === " ") {
      keys.space = false;
    }
    if (e.key === "1") {
      keys._1 = false;
      trySetDeploymentEnd();
    }
  });

  san.data.renderer.setSize(window.innerWidth, window.innerHeight);
  resizeCameraAndRerender();
  window.addEventListener("resize", resizeCameraAndRerender);

  document.body.appendChild(san.data.renderer.domElement);

  // const cameraQuat = new Quaternion();
  // cameraQuat.setFromAxisAngle(new Vector3(1, 0, 0), (3 * Math.PI) / 2);
  // camera.setRotationFromQuaternion(cameraQuat);

  // camera.position.set(0, 2, 0);

  const cubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeRenderTarget.texture.type = HalfFloatType;

  // TODO: Delete START
  const dragonflyGltf = cloneGltf(assets.dragonfly);
  const dragonfly = dragonflyGltf.scene;
  dragonfly.position.set(0, 0, 0);
  const flyClip = AnimationClip.findByName(dragonflyGltf.animations, "Fly");

  const dragonflyMixer = new AnimationMixer(dragonfly);
  const dragonflyFlyAction = dragonflyMixer.clipAction(flyClip);
  dragonflyFlyAction.timeScale = 5;
  dragonflyFlyAction.play();

  san.data.scene.add(dragonfly);
  dragonfly.position.set(30, 30, -600);
  dragonfly.rotateY(Math.PI);
  dragonfly.scale.multiplyScalar(0.6);
  // TODO: Delete END

  // const player = (function (): King {
  //   const playerGltf = cloneGltf(assets.azukiKing);
  //   const playerScene = playerGltf.scene;
  //   playerScene.position.set(0, 0, 100);
  //   const playerWalkClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Walk"
  //   );
  //   const playerStabClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Stab"
  //   );
  //   const playerSlashClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Slash"
  //   );

  //   const playerMixer = new AnimationMixer(playerScene);
  //   const playerWalkAction = playerMixer.clipAction(playerWalkClip);
  //   const playerStabAction = playerMixer.clipAction(playerStabClip);
  //   const playerSlashAction = playerMixer.clipAction(playerSlashClip);
  //   playerWalkAction.timeScale = 2;

  //   const playerDragonflyGltf = cloneGltf(assets.dragonfly);
  //   const playerDragonfly = playerDragonflyGltf.scene;
  //   playerDragonfly.position.set(0, 0, 0);
  //   scene.add(playerDragonfly);
  //   playerDragonfly.position.set(0, 2.5, 105);
  //   playerDragonfly.scale.multiplyScalar(0.6);

  //   const playerDragonflyMixer = new AnimationMixer(playerDragonfly);
  //   const playerDragonflyFlyClip = AnimationClip.findByName(
  //     dragonflyGltf.animations,
  //     "Fly"
  //   );
  //   const playerDragonflyFlyAction = playerDragonflyMixer.clipAction(
  //     playerDragonflyFlyClip
  //   );
  //   playerDragonflyFlyAction.timeScale = 5;
  //   playerDragonflyFlyAction.play();

  //   return {
  //     isKing: true,
  //     gltf: playerGltf,
  //     animation: {
  //       kind: SoldierAnimationKind.Idle,
  //       timeInSeconds: 0,
  //     },
  //     mixer: playerMixer,
  //     walkClip: playerWalkClip,
  //     walkAction: playerWalkAction,
  //     stabClip: playerStabClip,
  //     stabAction: playerStabAction,
  //     slashClip: playerSlashClip,
  //     slashAction: playerSlashAction,
  //     attackTarget: null,
  //     health: 100,
  //     yRot: 0,
  //     assemblyPoint: getDummyVector3(),
  //     dragonfly: {
  //       isBeingRidden: false,
  //       isLanding: false,
  //       gltf: playerDragonflyGltf,
  //       mixer: playerDragonflyMixer,
  //       flyClip: playerDragonflyFlyClip,
  //       flyAction: playerDragonflyFlyAction,
  //       speed: 30,
  //       yaw: 0,
  //       pitch: 0,
  //       roll: 0,
  //       dismountTimer: 0,
  //     },
  //   };
  // })();

  // const edamameKing = (function (): King {
  //   const playerGltf = cloneGltf(assets.edamameKing);
  //   const playerScene = playerGltf.scene;
  //   playerScene.position.set(0, 0, -50);
  //   playerScene.rotateY(Math.PI);
  //   const playerWalkClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Walk"
  //   );
  //   const playerStabClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Stab"
  //   );
  //   const playerSlashClip = AnimationClip.findByName(
  //     playerGltf.animations,
  //     "Slash"
  //   );

  //   const playerMixer = new AnimationMixer(playerScene);
  //   const playerWalkAction = playerMixer.clipAction(playerWalkClip);
  //   const playerStabAction = playerMixer.clipAction(playerStabClip);
  //   const playerSlashAction = playerMixer.clipAction(playerSlashClip);
  //   playerWalkAction.timeScale = 2;

  //   const playerDragonflyGltf = cloneGltf(assets.dragonfly);
  //   const playerDragonfly = playerDragonflyGltf.scene;
  //   playerDragonfly.position.set(0, 0, 0);
  //   playerDragonfly.position.set(0, 30, 0);
  //   playerDragonfly.scale.multiplyScalar(0.6);

  //   const playerDragonflyMixer = new AnimationMixer(playerDragonfly);
  //   const playerDragonflyFlyClip = AnimationClip.findByName(
  //     dragonflyGltf.animations,
  //     "Fly"
  //   );
  //   const playerDragonflyFlyAction = playerDragonflyMixer.clipAction(
  //     playerDragonflyFlyClip
  //   );
  //   playerDragonflyFlyAction.timeScale = 5;
  //   playerDragonflyFlyAction.play();

  //   return {
  //     isKing: true,
  //     gltf: playerGltf,
  //     animation: {
  //       kind: SoldierAnimationKind.Idle,
  //       timeInSeconds: 0,
  //     },
  //     mixer: playerMixer,
  //     walkClip: playerWalkClip,
  //     walkAction: playerWalkAction,
  //     stabClip: playerStabClip,
  //     stabAction: playerStabAction,
  //     slashClip: playerSlashClip,
  //     slashAction: playerSlashAction,
  //     attackTarget: null,
  //     health: 100,
  //     yRot: 0,
  //     assemblyPoint: getDummyVector3(),
  //     dragonfly: {
  //       isBeingRidden: false,
  //       isLanding: false,
  //       gltf: playerDragonflyGltf,
  //       mixer: playerDragonflyMixer,
  //       flyClip: playerDragonflyFlyClip,
  //       flyAction: playerDragonflyFlyAction,
  //       speed: 30,
  //       yaw: 0,
  //       pitch: 0,
  //       roll: 0,
  //       dismountTimer: 0,
  //     },
  //   };
  // })();
  // scene.add(edamameKing.gltf.scene);

  // const units = [
  //   getUnit({
  //     start: new Vector3(-50, 0, 100),
  //     forward: new Vector3(0, 0, 1).normalize(),
  //     dimensions: [10, 10],
  //     gap: [8, 8 * (Math.sqrt(3) / 2)],
  //     assets,
  //     allegiance: Allegiance.Azuki,
  //   }),

  //   getUnit({
  //     start: new Vector3(50, 0, -100),
  //     forward: new Vector3(0, 0, -1).normalize(),
  //     dimensions: [10, 10],
  //     gap: [8, 8 * (Math.sqrt(3) / 2)],
  //     assets,
  //     allegiance: Allegiance.Edamame,
  //   }),
  // ];
  // for (const unit of units) {
  //   for (const soldier of unit.soldiers) {
  //     scene.add(soldier.gltf.scene);
  //   }
  // }

  // const towers = [
  //   getBannerTower({
  //     position: new Vector3(-50, 0, -100),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(50, 0, -100),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(400, 0, -400),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-400, 0, -400),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(0, 0, -1000),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(700, 0, -1600),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-700, 0, -1600),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-50, 0, 100),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(50, 0, 100),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(400, 0, 400),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-400, 0, 400),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(0, 0, 1000),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(700, 0, 1600),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-700, 0, 1600),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  // ];
  // for (const tower of towers) {
  //   scene.add(getActiveBannerTowerGltf(tower).scene);
  // }

  const cursorGltf = cloneGltf(assets.azukiSpear);
  const cursor = cursorGltf.scene;
  cursor.position.set(3, 0, 0);
  const cursorWalkClip = AnimationClip.findByName(
    cursorGltf.animations,
    "Walk"
  );

  const cursorMixer = new AnimationMixer(cursor);
  const cursorWalkAction = cursorMixer.clipAction(cursorWalkClip);
  cursorWalkAction.play();

  san.data.scene.add(cursor);

  san.data.scene.add(new AmbientLight(0x888888, 10));

  const resources: Resources = {
    battle: new BattleState(getDefaultBattleState()),
    san,
    mouse,
    keys,
    assets,
  };

  const azukiKing = resources.battle.getAzukiKing();

  addEnvironment();

  onAnimationFrame();

  function resizeCameraAndRerender(): void {
    const { camera, renderer } = san.data;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  function render(): void {
    const { renderer, scene, camera } = san.data;
    renderer.render(scene, camera);
  }

  function onAnimationFrame(): void {
    const now = Date.now();
    worldTime = now;

    oncePerFrameBeforeTicks();

    while (lastWorldTime + MILLISECS_PER_TICK <= worldTime) {
      tick();
      lastWorldTime += MILLISECS_PER_TICK;
    }

    resetThreeScene(resources.san);

    updateThreeSceneAfterTicking(resources.battle, resources.san);

    updatePlannedDeploymentAfterUpdatingCamera(resources);

    updateThreeSceneAfterPlannedDeployment(resources.battle, resources.san);

    addInstancedMeshesToSceneAndFlagForUpdate(resources.san);

    render();

    requestAnimationFrame(onAnimationFrame);
  }

  function oncePerFrameBeforeTicks(): void {
    if (azukiKing.dragonflyId !== null) {
      // TODO
    } else {
      azukiKing.cameraPitch = -(mouse.y - 0.5) * Math.PI;
      azukiKing.orientation.yaw = -(mouse.x - 0.5) * Math.PI * 2;
    }
  }

  // function updateGroundCursorPosition(): void {
  //   const { battle } = resources;
  //   const { camera, grass } = san.data;
  //   const raycaster = new Raycaster();
  //   raycaster.set(
  //     camera.position,
  //     new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  //   );
  //   const hits = raycaster.intersectObject(grass, true);
  //   if (hits.length === 0) {
  //     battle.data.groundCursorPosition = null;
  //   } else {
  //     battle.data.groundCursorPosition = geoUtils.fromThreeVec(hits[0].point);
  //   }
  // }

  function tick(): void {
    const elapsedTimeInMillisecs = MILLISECS_PER_TICK;
    const elapsedTimeInSeconds = elapsedTimeInMillisecs / 1000;

    // dragonflyMixer.update(elapsedTimeInSeconds);
    // dragonfly.translateZ(30 * -elapsedTimeInSeconds);

    // azukiKing.dragonfly.mixer.update(elapsedTimeInSeconds);

    // cursorMixer.update((1 * elapsedTimeInMillisecs) / 1000);
    // cursor.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    // cursor.rotateY(
    //   Math.atan2(
    //     azukiKing.position[0] - cursor.position.x,
    //     azukiKing.position[2] - cursor.position.z
    //   )
    // );

    tickDragonflies(elapsedTimeInSeconds, resources);
    tickKings(elapsedTimeInSeconds, resources);
    tickPlannedDeployment(elapsedTimeInSeconds, resources);
    tickUnits(elapsedTimeInSeconds, resources);
    tickBannerTowers(elapsedTimeInSeconds, resources);
    tickSoldierExplosions(elapsedTimeInSeconds, resources);
  }

  // function oncePerFrameBeforeRender(): void {
  // if (!azukiKing.dragonfly.isBeingRidden) {
  //   azukiKing.gltf.scene.quaternion.setFromAxisAngle(
  //     new Vector3(0, 1, 0),
  //     azukiKing.yRot
  //   );
  // }
  // updateThreeJsProperties(azukiKing);
  // for (const unit of units) {
  //   for (const soldier of unit.soldiers) {
  //     updateThreeJsProperties(soldier);
  //   }
  // }
  // for (const tower of towers) {
  //   getActiveBannerTowerGltf(tower).scene.position.copy(tower.position);
  // }
  // if (resources.azukiKing.dragonfly.isBeingRidden) {
  //   // TODO
  //   camera.position.copy(player.gltf.scene.position);
  //   camera.quaternion.copy(player.gltf.scene.quaternion);
  //   camera.translateY(5);
  //   camera.translateZ(10);
  //   camera.rotateX(-(mouse.y - 0.5) * Math.PI);
  // } else {
  //   camera.position.copy(player.gltf.scene.position);
  //   camera.quaternion.copy(player.gltf.scene.quaternion);
  //   camera.translateY(5);
  //   camera.translateZ(5);
  //   camera.rotateX(-(mouse.y - 0.5) * Math.PI);
  // }
  // const raycaster = new Raycaster();
  // raycaster.set(
  //   camera.position,
  //   new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  // );
  // const hits = raycaster.intersectObject(grasslike, true);
  // if (hits.length === 0) {
  //   resources.groundCursor = null;
  // } else {
  //   resources.groundCursor = hits[0].point;
  // }
  // if (plannedDeployment.plannedUnit !== null) {
  //   for (const soldier of plannedDeployment.plannedUnit.soldiers) {
  //     scene.remove(soldier.gltf.scene);
  //   }
  // }
  // if (resources.groundCursor !== null) {
  //   cursor.position.copy(resources.groundCursor);
  //   if (plannedDeployment.start !== null) {
  //     const temp_fromStartToCursor = resources.groundCursor
  //       .clone()
  //       .sub(plannedDeployment.start);
  //     const fromStartToCursorLength = temp_fromStartToCursor.length();
  //     const RANK_GAP = 8;
  //     const width = Math.max(
  //       1,
  //       Math.floor(fromStartToCursorLength / RANK_GAP)
  //     );
  //     plannedDeployment.plannedUnit = getUnit({
  //       start: plannedDeployment.start,
  //       forward: temp_fromStartToCursor
  //         .clone()
  //         .normalize()
  //         .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
  //       dimensions: [width, 1],
  //       gap: [8, 8 * (Math.sqrt(3) / 2)],
  //       assets,
  //       allegiance: Allegiance.Azuki,
  //     });
  //     for (const soldier of plannedDeployment.plannedUnit.soldiers) {
  //       scene.add(soldier.gltf.scene);
  //       updateThreeJsProperties(soldier);
  //     }
  //   }
  // }
  // }

  function addEnvironment(): void {
    san.data.scene.environment = assets.environment;
  }

  function trySetDeploymentStart(wasKey1Down: boolean): void {
    const groundCursorPosition = getGroundCursorPosition(resources.san);
    if (groundCursorPosition === null || wasKey1Down) {
      return;
    }

    if (resources.battle.data.plannedDeployment.plannedUnit === null) {
      resources.battle.data.plannedDeployment.start =
        geoUtils.fromThreeVec(groundCursorPosition);
    } else {
      // TODO: For now, this is a no-op.
      // In the future, it might control the number of ranks of the legion.
    }
  }

  function trySetDeploymentEnd(): void {
    resources.battle.data.plannedDeployment.start = null;
  }
}

// function getUnit({
//   start,
//   forward,
//   dimensions: [width, height],
//   gap: [rightGap, backGap],
//   assets,
//   allegiance,
// }: {
//   start: Vector3;
//   forward: Vector3;
//   dimensions: [number, number];
//   gap: [number, number];
//   assets: Assets;
//   allegiance: Allegiance;
// }): Unit {
//   const rightStep = forward
//     .clone()
//     .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
//     .multiplyScalar(rightGap);
//   const backStep = forward
//     .clone()
//     .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
//     .multiplyScalar(backGap);
//   const soldiers: Soldier[] = [];
//   for (let right = 0; right < width; ++right) {
//     for (let back = 0; back < height; ++back) {
//       const soldierPosition = start
//         .clone()
//         .add(rightStep.clone().multiplyScalar(right + 0.5 * (back & 1)))
//         .add(backStep.clone().multiplyScalar(back));
//       const soldier = getSoldier(
//         soldierPosition.x,
//         soldierPosition.y,
//         soldierPosition.z,
//         allegiance,
//         assets
//       );
//       soldier.yRot = Math.atan2(forward.x, forward.z);
//       soldiers.push(soldier);
//     }
//   }
//   return {
//     order: { kind: UnitOrderKind.Advance },
//     soldiers,
//     forward,
//     isPreview: false,
//     allegiance,
//     areSoldiersStillBeingAdded: false,
//   };
// }

// function getSoldier(
//   x: number,
//   y: number,
//   z: number,
//   allegiance: Allegiance,
//   assets: Assets
// ): Soldier {
//   const soldierGltf =
//     allegiance === Allegiance.Azuki
//       ? cloneGltf(assets.azukiSpear)
//       : cloneGltf(assets.edamameSpear);
//   const soldierScene = soldierGltf.scene;
//   soldierScene.position.set(x, y, z);
//   const walkClip = AnimationClip.findByName(soldierGltf.animations, "Walk");
//   const stabClip = AnimationClip.findByName(soldierGltf.animations, "Stab");

//   const mixer = new AnimationMixer(soldierScene);
//   const walkAction = mixer.clipAction(walkClip);
//   const stabAction = mixer.clipAction(stabClip);
//   stabAction.timeScale = 0.5;

//   return {
//     gltf: soldierGltf,
//     animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
//     mixer,
//     walkClip,
//     walkAction,
//     stabClip,
//     stabAction,
//     attackTarget: null,
//     health: 100,
//     yRot: 0,
//     assemblyPoint: getDummyVector3(),
//   };
// }

// function getBannerTower({
//   position,
//   allegiance,
//   assets,
// }: {
//   position: Vector3;

//   allegiance: Allegiance;
//   assets: Assets;
// }): BannerTower {
//   return {
//     position,
//     azukiGltf: cloneGltf(assets.azukiBannerTower),
//     edamameGltf: cloneGltf(assets.edamameBannerTower),
//     isPreview: false,
//     allegiance,
//     pendingSoldiers: [],
//     secondsUntilNextSoldier: 0,
//   };
// }

// function startOrContinueWalkingAnimation(
//   elapsedTimeInSeconds: number,
//   animation: SoldierAnimationState,
//   timeScale: number,
//   assets: Assets
// ): void {
//   const scaledWalkClipDuration = assets.azukiSpearWalkClip.duration / timeScale;
//   if (animation.kind !== SoldierAnimationKind.Walk) {
//     animation.kind = SoldierAnimationKind.Walk;
//     animation.timeInSeconds = 0;
//   } else {
//     animation.timeInSeconds =
//       (animation.timeInSeconds + elapsedTimeInSeconds) % scaledWalkClipDuration;
//   }
// }

function startOrContinueWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): void {
  const timeScale = 1;
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind !== SoldierAnimationKind.Walk) {
    animation.kind = SoldierAnimationKind.Walk;
    animation.timeInSeconds = 0;
  } else {
    animation.timeInSeconds =
      (animation.timeInSeconds + elapsedTimeInSeconds) % scaledWalkClipDuration;
  }
}

/** Returns whether the animation crosses the damage point during this tick. */
function startOrContinueSlashAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  const timeScale = 1;
  const scaledSlashClipDuration = mcon.azukiKingSlashClipDuration / timeScale;
  if (animation.kind !== SoldierAnimationKind.Slash) {
    animation.kind = SoldierAnimationKind.Slash;
    animation.timeInSeconds = 0;
    return false;
  } else {
    // We should deal damage on slash animation frame 18.
    const SLASH_DAMAGE_POINT_LOCATION_FACTOR = 18 / 30;
    const damageTime =
      scaledSlashClipDuration * SLASH_DAMAGE_POINT_LOCATION_FACTOR;
    const finishes =
      animation.timeInSeconds < damageTime &&
      animation.timeInSeconds + elapsedTimeInSeconds >= damageTime;
    animation.timeInSeconds =
      (animation.timeInSeconds + elapsedTimeInSeconds) %
      scaledSlashClipDuration;
    return finishes;
  }
}

function stopWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): void {
  const timeScale = 1;
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind === SoldierAnimationKind.Walk) {
    const halfwayPoint = 0.5 * scaledWalkClipDuration;
    const reachesHalfwayPointThisTick =
      animation.timeInSeconds < halfwayPoint &&
      animation.timeInSeconds + elapsedTimeInSeconds >= halfwayPoint;
    const reachesEndThisTick =
      animation.timeInSeconds + elapsedTimeInSeconds >= scaledWalkClipDuration;

    if (reachesHalfwayPointThisTick || reachesEndThisTick) {
      animation.kind = SoldierAnimationKind.Idle;
      animation.timeInSeconds = 0;
    } else {
      animation.timeInSeconds += elapsedTimeInSeconds;
    }
  }
}

function stopWalkingAndStartStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  mcon: ModelConstants
): void {
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind === SoldierAnimationKind.Walk) {
    const halfwayPoint = 0.5 * scaledWalkClipDuration;
    const reachesHalfwayPointThisTick =
      animation.timeInSeconds < halfwayPoint &&
      animation.timeInSeconds + elapsedTimeInSeconds >= halfwayPoint;
    const reachesEndThisTick =
      animation.timeInSeconds + elapsedTimeInSeconds >= scaledWalkClipDuration;

    if (reachesHalfwayPointThisTick || reachesEndThisTick) {
      animation.kind = SoldierAnimationKind.Stab;
      // TODO: This is just a hack.
      // Ideally, timeInSeconds should never be negative.
      animation.timeInSeconds = -Math.random() * MAX_STAB_DELAY;
    } else {
      animation.timeInSeconds += elapsedTimeInSeconds;
    }
  }
}

const STAB_DAMAGE_POINT_LOCATION_FACTOR = 10 / 24;

/** Returns whether the animation crosses the damage point during this tick. */
function continueStabThenIdleAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  const damageTime =
    mcon.azukiSpearStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR;
  const newTimeInSeconds =
    animation.timeInSeconds + elapsedTimeInSeconds * STAB_TIME_SCALE;
  const dealsDamageThisTick =
    animation.timeInSeconds < damageTime && newTimeInSeconds >= damageTime;

  animation.timeInSeconds = newTimeInSeconds;

  if (animation.timeInSeconds >= mcon.azukiSpearStabClipDuration) {
    animation.kind = SoldierAnimationKind.Idle;
    animation.timeInSeconds =
      (animation.timeInSeconds - mcon.azukiSpearStabClipDuration) /
      STAB_TIME_SCALE;
  }

  return dealsDamageThisTick;
}

/** Returns whether the animation crosses the damage point during this tick. */
function continueIdleThenStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  animation.timeInSeconds += elapsedTimeInSeconds;
  if (animation.timeInSeconds >= STAB_COOLDOWN) {
    animation.kind = SoldierAnimationKind.Stab;
    animation.timeInSeconds =
      (animation.timeInSeconds - STAB_COOLDOWN) * STAB_TIME_SCALE -
      // TODO: This is just a hack.
      // Ideally, timeInSeconds should never be negative.
      Math.random() * MAX_STAB_DELAY;

    return (
      animation.timeInSeconds >=
      mcon.azukiSpearStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR
    );
  }

  return false;
}

function tickKings(elapsedTimeInSeconds: number, resources: Resources): void {
  const azukiKing = resources.battle.getAzukiKing();
  const edamameKing = resources.battle.getEdamameKing();
  const { keys, mouse } = resources;
  const { mcon } = resources.san.data;

  if (azukiKing.health <= 0) {
    alertOnceAfterDelay("Edamame wins!");

    if (
      // resources.scene.children.some(
      //   (child) => child === resources.azukiKing.gltf.scene
      // )

      // TODO: Fix this
      !hasAlerted
    ) {
      const azukiExplosion = getSoldierExplosion(
        Allegiance.Azuki,
        azukiKing.position,
        azukiKing.orientation
      );
      resources.battle.data.soldierExplosions.push(azukiExplosion);
    }
  }

  if (edamameKing.health <= 0) {
    alertOnceAfterDelay("Azuki wins!");

    if (
      // TODO: Fix this
      !hasAlerted
    ) {
      const edamameExplosion = getSoldierExplosion(
        Allegiance.Edamame,
        edamameKing.position,
        edamameKing.orientation
      );
      resources.battle.data.soldierExplosions.push(edamameExplosion);
    }
  }

  if (
    azukiKing.dragonflyId !== null &&
    resources.battle.getDragonfly(azukiKing.dragonflyId).flightState.kind ===
      DragonflyFlightKind.Resting
  ) {
    azukiKing.dragonflyId = null;

    azukiKing.position[1] = 0;
  }

  if (azukiKing.dragonflyId !== null) {
    const azukiKingDragonfly = resources.battle.getDragonfly(
      azukiKing.dragonflyId
    );
    if (keys.t) {
      azukiKingDragonfly.speed += 10 * elapsedTimeInSeconds;
    }
    if (keys.g) {
      azukiKingDragonfly.speed = Math.max(
        DRAGONFLY_MIN_SPEED,
        azukiKingDragonfly.speed - 10 * elapsedTimeInSeconds
      );
    }
    // TODO
    // if (
    //   keys.r &&
    //   geoUtils.distanceToSquared(
    //     azukiKing.position,
    //     azukiKingDragonfly.position
    //   ) <= DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED &&
    //   mouse.isLocked
    // ) {
    //   mouse.x = 0.5;
    //   mouse.y = 0.5;
    //   azukiKingDragonfly.isBeingRidden = true;
    //   azukiKingDragonfly.isLanding = false;
    //   azukiKingDragonfly.speed = DRAGONFLY_MIN_SPEED;
    // }

    if (azukiKingDragonfly.flightState.kind === DragonflyFlightKind.Landing) {
      if (
        azukiKingDragonfly.position[1] <= 2.5 &&
        azukiKingDragonfly.speed < 5
      ) {
      } else {
        azukiKing.orientation.yaw = azukiKingDragonfly.orientation.yaw;

        geoUtils.setTriple(azukiKing.position, azukiKingDragonfly.position);
        geoUtils.setOrientation(
          azukiKing.orientation,
          azukiKingDragonfly.orientation
        );
        geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);
      }
    } else {
      let wrappedMouseX = mouse.x;
      while (wrappedMouseX > 1) {
        wrappedMouseX -= 1;
      }
      while (wrappedMouseX < -1) {
        wrappedMouseX += 1;
      }

      geoUtils.setTriple(azukiKing.position, azukiKingDragonfly.position);
      geoUtils.setOrientation(
        azukiKing.orientation,
        azukiKingDragonfly.orientation
      );
      geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);
    }
  } else {
    if (keys.w) {
      startOrContinueWalkingAnimation(
        elapsedTimeInSeconds,
        azukiKing.animation,
        mcon
      );
    } else {
      stopWalkingAnimation(elapsedTimeInSeconds, azukiKing.animation, mcon);
    }

    if (
      azukiKing.animation.kind === SoldierAnimationKind.Slash ||
      (keys.space && azukiKing.animation.kind === SoldierAnimationKind.Idle)
    ) {
      const slashActionTimeScale = 1;
      const finishesSlashCycleThisTick =
        azukiKing.animation.timeInSeconds + elapsedTimeInSeconds >=
        mcon.azukiKingSlashClipDuration / slashActionTimeScale;
      const dealsDamageThisTick = startOrContinueSlashAnimation(
        elapsedTimeInSeconds,
        azukiKing.animation,
        mcon
      );
      if (dealsDamageThisTick) {
        applyKingSlashDamage(Allegiance.Azuki, resources.battle);
      }
      if (finishesSlashCycleThisTick && !keys.space) {
        azukiKing.animation = {
          kind: SoldierAnimationKind.Idle,
          timeInSeconds: 0,
        };
      }
    }

    if (azukiKing.animation.kind === SoldierAnimationKind.Walk) {
      geoUtils.translateZ(
        azukiKing.position,
        azukiKing.orientation,
        -3 * elapsedTimeInSeconds
      );
    }
  }
}

function tickDragonflies(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { battle } = resources;
  for (const id of battle.data.activeDragonflyIds) {
    const dragonfly = battle.getDragonfly(id);
    tickDragonfly(dragonfly, elapsedTimeInSeconds, resources);
  }
}

function tickDragonfly(
  dragonfly: Dragonfly,
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { mouse, keys } = resources;
  const { mcon } = resources.san.data;

  if (dragonfly.animation.kind === DragonflyAnimationKind.Fly) {
    dragonfly.animation.timeInSeconds =
      (dragonfly.animation.timeInSeconds + elapsedTimeInSeconds * 5) %
      mcon.dragonflyFlyClipDuration;
  }

  if (dragonfly.flightState.kind === DragonflyFlightKind.Flying) {
    // TODO
    let wrappedMouseX = mouse.x;
    while (wrappedMouseX > 1) {
      wrappedMouseX -= 1;
    }
    while (wrappedMouseX < -1) {
      wrappedMouseX += 1;
    }

    dragonfly.orientation.yaw +=
      0.5 * elapsedTimeInSeconds * (dragonfly.orientation.roll * 2);

    const { battle } = resources;
    const azukiKing = battle.getAzukiKing();
    const isAzukiKingDragonfly =
      azukiKing.dragonflyId !== null &&
      dragonfly === battle.getDragonfly(azukiKing.dragonflyId);
    if (isAzukiKingDragonfly) {
      dragonfly.orientation.roll = -(mouse.x - 0.5) * Math.PI;
      dragonfly.orientation.pitch = -(mouse.y - 0.5) * Math.PI;
    }

    // TODOX
    // azukiKing.orientation.yaw = dragonfly.orientation.yaw;

    // azukiKing.dragonfly.gltf.scene.quaternion.setFromAxisAngle(
    //   new Vector3(0, 1, 0),
    //   azukiKing.yRot
    // );
    // azukiKing.dragonfly.gltf.scene.rotateX(azukiKing.dragonfly.pitch);
    // azukiKing.dragonfly.gltf.scene.rotateZ(azukiKing.dragonfly.roll);

    geoUtils.translateZ(
      dragonfly.position,
      dragonfly.orientation,
      dragonfly.speed * -elapsedTimeInSeconds
    );

    // TODOX
    // geoUtils.setTriple(azukiKing.position, dragonfly.position);
    // geoUtils.setOrientation(azukiKing.orientation, dragonfly.orientation);
    // geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);

    // azukiKing.gltf.scene.position.copy(
    //   azukiKing.dragonfly.gltf.scene.position
    // );
    // azukiKing.gltf.scene.quaternion.copy(
    //   azukiKing.dragonfly.gltf.scene.quaternion
    // );
    // azukiKing.gltf.scene.translateZ(-0.3);

    // TODO: Generalize isLanding to include NPCs.
    const isLanding = isAzukiKingDragonfly && keys.v;
    if (
      dragonfly.position[1] < 10 &&
      dragonfly.speed <= MAX_LANDING_SPEED &&
      isLanding
    ) {
      dragonfly.flightState = {
        kind: DragonflyFlightKind.Landing,
      };
      dragonfly.dismountTimer = 1.5;
    }
  }

  if (dragonfly.flightState.kind === DragonflyFlightKind.Landing) {
    if (dragonfly.position[1] <= 2.5 && dragonfly.speed < 5) {
      dragonfly.dismountTimer -= elapsedTimeInSeconds;
      if (dragonfly.dismountTimer <= 0) {
        // TODO: Dismount
        // azukiKingDragonfly.isBeingRidden = false;
        dragonfly.flightState = {
          kind: DragonflyFlightKind.Resting,
        };
        // TODOX
        // azukiKing.position[1] = 0;
      }
    } else {
      dragonfly.orientation.yaw +=
        0.5 * elapsedTimeInSeconds * (dragonfly.orientation.roll * 2);
      dragonfly.orientation.pitch = limitTurn(
        dragonfly.orientation.pitch,
        0,
        0.5 * Math.PI * elapsedTimeInSeconds
      );
      dragonfly.orientation.roll = limitTurn(
        dragonfly.orientation.roll,
        0,
        0.2 * Math.PI * elapsedTimeInSeconds
      );

      if (
        dragonfly.orientation.pitch === 0 &&
        dragonfly.orientation.roll === 0
      ) {
        dragonfly.speed = Math.max(
          0,
          dragonfly.speed * 0.6 ** elapsedTimeInSeconds
        );
        dragonfly.position[1] = Math.max(
          2.5,
          dragonfly.position[1] * 0.7 ** elapsedTimeInSeconds
        );
      }

      // TODOX
      // azukiKing.orientation.yaw = dragonfly.orientation.yaw;

      // player.dragonfly.gltf.scene.quaternion.setFromAxisAngle(
      //   new Vector3(0, 1, 0),
      //   player.yRot
      // );
      // player.dragonfly.gltf.scene.rotateX(player.dragonfly.pitch);
      // player.dragonfly.gltf.scene.rotateZ(player.dragonfly.roll);

      geoUtils.translateZ(
        dragonfly.position,
        dragonfly.orientation,
        dragonfly.speed * -elapsedTimeInSeconds
      );

      // TODOX
      // geoUtils.setTriple(azukiKing.position, dragonfly.position);
      // geoUtils.setOrientation(azukiKing.orientation, dragonfly.orientation);
      // geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);

      // player.gltf.scene.position.copy(player.dragonfly.gltf.scene.position);
      // player.gltf.scene.quaternion.copy(
      //   player.dragonfly.gltf.scene.quaternion
      // );
      // player.gltf.scene.translateZ(-0.3);
    }
  }
}

function tickPlannedDeployment(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { keys, battle } = resources;
  const { plannedDeployment } = resources.battle.data;
  const selectedTowerId = getAzukiBannerTowerEnclosingGroundCursor(resources);
  if (
    plannedDeployment.plannedUnit !== null &&
    keys.f &&
    selectedTowerId !== null
  ) {
    const selectedTower = battle.getBannerTower(selectedTowerId);

    const assemblingUnit: Unit = {
      order: { kind: UnitOrderKind.Assemble },
      soldierIds: [],
      forward: plannedDeployment.plannedUnit.forward,
      isPreview: false,
      allegiance: plannedDeployment.plannedUnit.allegiance,
      areSoldiersStillBeingAdded: true,
    };
    const assemblingUnitId = battle.addEntity(assemblingUnit);
    selectedTower.pendingUnits.push({
      unitId: assemblingUnitId,
      soldiers: plannedDeployment.plannedUnit.soldiers,
    });
    battle.data.activeUnitIds.push(assemblingUnitId);

    plannedDeployment.plannedUnit = null;
  }
}

// function updateThreeJsProperties(soldier: Soldier | King): void {
//   if (soldier.animation.kind === SoldierAnimationKind.Walk) {
//     soldier.walkAction.play();

//     soldier.stabAction.stop();
//     if (isKing(soldier)) {
//       soldier.slashAction.stop();
//     }

//     soldier.mixer.setTime(soldier.animation.timeInSeconds);
//   } else if (soldier.animation.kind === SoldierAnimationKind.Stab) {
//     soldier.stabAction.play();

//     soldier.walkAction.stop();
//     if (isKing(soldier)) {
//       soldier.slashAction.stop();
//     }

//     soldier.mixer.setTime(soldier.animation.timeInSeconds);
//   } else if (soldier.animation.kind === SoldierAnimationKind.Slash) {
//     if (isKing(soldier)) {
//       soldier.slashAction.play();
//     }

//     soldier.walkAction.stop();
//     soldier.stabAction.stop();

//     soldier.mixer.setTime(soldier.animation.timeInSeconds);
//   } else {
//     soldier.walkAction.stop();
//     soldier.stabAction.stop();
//     if (isKing(soldier)) {
//       soldier.slashAction.stop();
//     }
//   }

//   if (!isKing(soldier)) {
//     soldier.gltf.scene.quaternion.setFromAxisAngle(
//       new Vector3(0, 1, 0),
//       soldier.yRot
//     );
//   }
// }

function tickUnits(elapsedTimeInSeconds: number, resources: Resources): void {
  const { battle } = resources;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    const { soldierIds } = unit;
    for (let i = 0; i < soldierIds.length; ++i) {
      const soldierId = soldierIds[i];
      const soldier = battle.getSoldier(soldierId);
      if (soldier.health <= 0) {
        // scene.remove(soldier.gltf.scene);
        const explosion = getSoldierExplosion(
          unit.allegiance,
          soldier.position,
          soldier.orientation
        );
        battle.data.soldierExplosions.push(explosion);
        soldierIds.splice(i, 1);
        --i;
        continue;
      }
    }
  }

  for (const unitId of battle.data.activeUnitIds) {
    tickUnit(elapsedTimeInSeconds, unitId, resources);
  }
}

function tickUnit(
  elapsedTimeInSeconds: number,
  unitId: Ref,
  resources: Resources
): void {
  const unit = resources.battle.getUnit(unitId);
  switch (unit.order.kind) {
    case UnitOrderKind.Advance:
      tickUnitWithAdvanceOrder(
        elapsedTimeInSeconds,
        unit,
        unit.order,
        resources
      );
      return;
    case UnitOrderKind.Storm:
      tickUnitWithStormOrder(elapsedTimeInSeconds, unit, unit.order, resources);
      return;
    case UnitOrderKind.Assemble:
      tickUnitWithAssembleOrder(
        elapsedTimeInSeconds,
        unit,
        unit.order,
        resources
      );
      return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _exhaustiveCheck: never = unit.order;
}

function tickUnitWithAdvanceOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: AdvanceOrder,
  resources: Resources
): void {
  const { assets, battle } = resources;

  const { soldierIds } = unit;

  const wasAnySoldierFighting = soldierIds.some(
    (soldierId) => battle.getSoldier(soldierId).attackTargetId !== null
  );
  if (!wasAnySoldierFighting) {
    const forwardAngle = Math.atan2(unit.forward[0], unit.forward[2]);
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      const nearestEnemy = getNearestEnemyId(
        soldier,
        unit,
        SPEAR_ATTACK_RANGE_SQUARED,
        resources
      );
      if (nearestEnemy !== null) {
        soldier.attackTargetId = nearestEnemy;
      } else {
        const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
        soldier.orientation.yaw = limitTurn(
          soldier.orientation.yaw,
          forwardAngle,
          radiansPerTick
        );
        if (soldier.orientation.yaw === forwardAngle) {
          startOrContinueWalkingAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          geoUtils.translateZ(
            soldier.position,
            soldier.orientation,
            -1.5 * elapsedTimeInSeconds
          );
        }
      }
    }
  } else {
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      if (
        soldier.attackTargetId !== null &&
        battle.getSoldier(soldier.attackTargetId).health <= 0
      ) {
        soldier.attackTargetId = null;
      }

      if (soldier.attackTargetId === null) {
        const nearestEnemy = getNearestEnemyId(
          soldier,
          unit,
          SPEAR_ATTACK_RANGE_SQUARED,
          resources
        );
        if (nearestEnemy !== null) {
          soldier.attackTargetId = nearestEnemy;
        }
      }

      if (soldier.animation.kind === SoldierAnimationKind.Walk) {
        stopWalkingAndStartStabAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          1,
          assets.mcon
        );
      }

      if (soldier.attackTargetId !== null) {
        const attackTarget = battle.getSoldier(soldier.attackTargetId);
        const difference = geoUtils.sub(
          attackTarget.position,
          soldier.position
        );
        const desiredYRot =
          Math.atan2(difference[0], difference[2]) + Math.PI + 0.05;
        const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
        soldier.orientation.yaw = limitTurn(
          soldier.orientation.yaw,
          desiredYRot,
          radiansPerTick
        );

        if (soldier.animation.kind === SoldierAnimationKind.Stab) {
          const dealsDamageThisTick = continueStabThenIdleAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        } else if (soldier.animation.kind === SoldierAnimationKind.Idle) {
          const dealsDamageThisTick = continueIdleThenStabAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        }
      }
    }
  }
}

function tickUnitWithStormOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: StormOrder,
  resources: Resources
): void {
  const { assets, battle } = resources;

  const { soldierIds } = unit;

  for (const soldierId of soldierIds) {
    const soldier = battle.getSoldier(soldierId);
    if (
      soldier.attackTargetId !== null &&
      battle.getSoldier(soldier.attackTargetId).health <= 0
    ) {
      soldier.attackTargetId = null;
    }

    const nearestEnemy = getNearestEnemyId(
      soldier,
      unit,
      SPEAR_ATTACK_RANGE_SQUARED,
      resources
    );

    if (soldier.attackTargetId === null) {
      if (nearestEnemy !== null) {
        soldier.attackTargetId = nearestEnemy;
      }
    }

    if (soldier.attackTargetId !== null) {
      if (soldier.animation.kind === SoldierAnimationKind.Walk) {
        stopWalkingAndStartStabAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          1,
          assets.mcon
        );
      }

      const attackTarget = battle.getSoldier(soldier.attackTargetId);
      const difference = geoUtils.sub(attackTarget.position, soldier.position);
      const desiredYRot =
        Math.atan2(difference[0], difference[2]) + Math.PI + 0.05;
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );

      if (soldier.animation.kind === SoldierAnimationKind.Stab) {
        const dealsDamageThisTick = continueStabThenIdleAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          assets.mcon
        );
        if (dealsDamageThisTick) {
          attackTarget.health -= STAB_DAMAGE;
        }
      } else if (soldier.animation.kind === SoldierAnimationKind.Idle) {
        const dealsDamageThisTick = continueIdleThenStabAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          assets.mcon
        );
        if (dealsDamageThisTick) {
          attackTarget.health -= STAB_DAMAGE;
        }
      }
    } else {
      const forwardAngle = Math.atan2(unit.forward[0], unit.forward[2]);
      if (nearestEnemy !== null) {
        soldier.attackTargetId = nearestEnemy;
      } else {
        const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
        soldier.orientation.yaw = limitTurn(
          soldier.orientation.yaw,
          forwardAngle,
          radiansPerTick
        );
        if (soldier.orientation.yaw === forwardAngle) {
          startOrContinueWalkingAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          geoUtils.translateZ(
            soldier.position,
            soldier.orientation,
            -1.5 * elapsedTimeInSeconds
          );
        }
      }
    }
  }
}

function tickUnitWithAssembleOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: AssembleOrder,
  resources: Resources
): void {
  const { battle } = resources;

  let isUnitStillAssembling = false;

  for (const soldierId of unit.soldierIds) {
    const soldier = battle.getSoldier(soldierId);

    let isReadyForCombat = false;

    const difference = geoUtils.sub(soldier.assemblyPoint, soldier.position);
    if (geoUtils.lengthSquared(difference) < 0.1) {
      const desiredYRot = Math.atan2(unit.forward[0], unit.forward[2]);
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );
      stopWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        resources.assets.mcon
      );

      if (
        soldier.animation.kind === SoldierAnimationKind.Idle &&
        soldier.orientation.yaw === desiredYRot
      ) {
        isReadyForCombat = true;
      }
    } else {
      const desiredYRot = Math.atan2(difference[0], difference[2]) + Math.PI;
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );
      startOrContinueWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        resources.assets.mcon
      );
      geoUtils.translateZ(
        soldier.position,
        soldier.orientation,
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * -1.5 * elapsedTimeInSeconds
      );
    }

    if (soldier.health > 0 && !isReadyForCombat) {
      isUnitStillAssembling = true;
    }
  }

  if (!unit.areSoldiersStillBeingAdded && !isUnitStillAssembling) {
    unit.order = { kind: UnitOrderKind.Storm };
  }
}

function getNearestEnemyId(
  soldier: Soldier,
  soldierUnit: Unit,
  rangeSquared: number,
  { battle }: Resources
): null | Ref {
  const azukiKing = battle.getAzukiKing();
  const edamameKing = battle.getEdamameKing();

  let nearestEnemyId: Ref | null = null;
  let nearestDistanceSquared = Infinity;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === soldierUnit.allegiance || unit.isPreview) {
      continue;
    }

    for (const enemyId of unit.soldierIds) {
      const enemy = battle.getSoldier(enemyId);
      const distSq = geoUtils.distanceToSquared(
        soldier.position,
        enemy.position
      );
      if (distSq < nearestDistanceSquared) {
        nearestEnemyId = enemyId;
        nearestDistanceSquared = distSq;
      }
    }
  }

  if (soldierUnit.allegiance !== Allegiance.Azuki) {
    const distSq = geoUtils.distanceToSquared(
      soldier.position,
      azukiKing.position
    );
    if (distSq < nearestDistanceSquared && azukiKing.health > 0) {
      nearestEnemyId = battle.data.azukiKingId;
      nearestDistanceSquared = distSq;
    }
  }

  if (soldierUnit.allegiance !== Allegiance.Edamame) {
    const distSq = geoUtils.distanceToSquared(
      soldier.position,
      edamameKing.position
    );
    if (distSq < nearestDistanceSquared && edamameKing.health > 0) {
      nearestEnemyId = battle.data.edamameKingId;
      nearestDistanceSquared = distSq;
    }
  }

  if (nearestDistanceSquared > rangeSquared) {
    return null;
  }

  return nearestEnemyId;
}

function limitTurn(
  currentAngle: number,
  desiredAngle: number,
  maxChange: number
): number {
  let difference = desiredAngle - currentAngle;
  while (difference > Math.PI) {
    difference -= Math.PI * 2;
  }
  while (difference < -Math.PI) {
    difference += Math.PI * 2;
  }

  const absDifference = Math.abs(difference);
  if (absDifference <= maxChange) {
    return desiredAngle;
  }
  return currentAngle + maxChange * Math.sign(difference);
}

const UNOCCUPIED = Symbol();
const CONTESTED = Symbol();
function tickBannerTowers(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { battle } = resources;
  for (const towerId of battle.data.activeTowerIds) {
    tickBannerTower(elapsedTimeInSeconds, towerId, resources);
  }
}

function tickBannerTower(
  elapsedTimeInSeconds: number,
  towerId: Ref,
  { assets, battle }: Resources
): void {
  const tower = battle.getBannerTower(towerId);

  if (tower.isPreview) {
    return;
  }

  let uniqueOccupier: typeof UNOCCUPIED | typeof CONTESTED | Allegiance =
    UNOCCUPIED;

  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (
      uniqueOccupier === CONTESTED ||
      uniqueOccupier === unit.allegiance ||
      unit.isPreview
    ) {
      break;
    }

    const { soldierIds } = unit;
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      if (inTowerTerritory(soldier.position, tower.position)) {
        if (uniqueOccupier === UNOCCUPIED) {
          uniqueOccupier = unit.allegiance;
        } else if (uniqueOccupier !== unit.allegiance) {
          uniqueOccupier = CONTESTED;
          break;
        }
      }
    }
  }

  if (
    uniqueOccupier !== UNOCCUPIED &&
    uniqueOccupier !== CONTESTED &&
    tower.allegiance !== uniqueOccupier
  ) {
    tower.allegiance = uniqueOccupier;
  }

  tower.secondsUntilNextSoldier -= elapsedTimeInSeconds;
  if (tower.secondsUntilNextSoldier <= 0 && tower.pendingUnits.length > 0) {
    const pendingUnit = tower.pendingUnits[0];
    const assemblingUnit = battle.getUnit(pendingUnit.unitId);
    const plannedSoldier = pendingUnit.soldiers.shift()!;
    const soldier: Soldier = {
      position: plannedSoldier.position,
      animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
      attackTargetId: null,
      health: 100,
      orientation: { yaw: plannedSoldier.yRot, pitch: 0, roll: 0 },
      assemblyPoint: plannedSoldier.assemblyPoint,
    };
    geoUtils.setTriple(soldier.position, tower.position);
    const soldierId = battle.addEntity(soldier);
    assemblingUnit.soldierIds.push(soldierId);
    // scene.add(soldier.gltf.scene);
    if (pendingUnit.soldiers.length === 0) {
      assemblingUnit.areSoldiersStillBeingAdded = false;
      tower.pendingUnits.shift();
    }
    tower.secondsUntilNextSoldier = SOLDIER_DEPLOYMENT_DELAY_SECONDS;
  }
}

function tickSoldierExplosions(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { soldierExplosionClipDuration } = resources.assets.mcon;
  const { battle } = resources;
  const { soldierExplosions } = battle.data;
  for (let i = 0; i < soldierExplosions.length; ++i) {
    const explosion = soldierExplosions[i];
    explosion.timeInSeconds += elapsedTimeInSeconds;

    if (explosion.timeInSeconds > soldierExplosionClipDuration) {
      // if (explosion.scene !== null) {
      //   resources.scene.remove(explosion.scene);
      // }
      soldierExplosions.splice(i, 1);
      continue;
    }

    // const zeroIndexedFrameNumber = Math.min(
    //   Math.floor(
    //     (explosion.timeInSeconds / SOLDIER_EXPLOSION_DURATION) *
    //       SOLDIER_EXPLOSION_FRAME_COUNT
    //   ),
    //   SOLDIER_EXPLOSION_FRAME_COUNT - 1
    // );

    // if (explosion.scene !== null) {
    //   resources.scene.remove(explosion.scene);
    // }

    // const explosionFrames =
    //   explosion.allegiance === Allegiance.Azuki
    //     ? resources.assets.explodingAzukiFrames
    //     : resources.assets.explodingEdamameFrames;
    // explosion.scene = explosionFrames[zeroIndexedFrameNumber].clone(true);
    // explosion.scene.position.copy(explosion.position);
    // explosion.scene.quaternion.copy(explosion.quaternion);
    // resources.scene.add(explosion.scene);
  }
}

function inTowerTerritory(
  possibleOccupierPosition: Triple,
  towerPosition: Triple
): boolean {
  const localX = possibleOccupierPosition[0] - towerPosition[0];
  const localZ = possibleOccupierPosition[2] - towerPosition[2];
  return (
    possibleOccupierPosition[1] < 1 &&
    -10 <= localX &&
    localX <= 10 &&
    -10 <= localZ &&
    localZ <= 10
  );
}

// function getActiveBannerTowerGltf(tower: BannerTower): GLTF {
//   return tower.allegiance === Allegiance.Azuki
//     ? tower.azukiGltf
//     : tower.edamameGltf;
// }

function applyKingSlashDamage(
  allegiance: Allegiance,
  battle: BattleState
): void {
  const king =
    allegiance === Allegiance.Azuki
      ? battle.getAzukiKing()
      : battle.getEdamameKing();
  const { orientation, position } = king;
  const slashRangeSquared = 6 ** 2;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === allegiance) {
      continue;
    }

    for (const soldierId of unit.soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      const differenceSquared = geoUtils.distanceToSquared(
        soldier.position,
        position
      );

      const angleDifference = normalizeAngleBetweenNegPiAndPosPi(
        orientation.yaw -
          Math.atan2(
            soldier.position[0] - position[0],
            soldier.position[2] - position[2]
          ) +
          Math.PI
      );
      if (
        !(
          differenceSquared <= slashRangeSquared &&
          Math.abs(angleDifference) <= Math.PI * 0.2
        )
      ) {
        continue;
      }

      soldier.health -= SLASH_DAMAGE;
    }
  }
}

function normalizeAngleBetweenNegPiAndPosPi(angle: number): number {
  let out = angle;
  while (out < Math.PI) {
    out += Math.PI * 2;
  }
  while (out > Math.PI) {
    out -= Math.PI * 2;
  }
  return out;
}

function getSoldierExplosion(
  allegiance: Allegiance,
  position: Triple,
  orientation: Orientation
): SoldierExplosion {
  return {
    allegiance,
    position: [position[0], position[1], position[2]],
    orientation,
    timeInSeconds: 0,
  };
}

function getAzukiBannerTowerEnclosingGroundCursor(
  resources: Resources
): null | Ref {
  const groundCursorPosition = getGroundCursorPosition(resources.san);
  if (groundCursorPosition === null) {
    return null;
  }

  for (const towerId of resources.battle.data.activeTowerIds) {
    const tower = resources.battle.getBannerTower(towerId);
    if (
      tower.allegiance === Allegiance.Azuki &&
      inTowerTerritory(
        geoUtils.fromThreeVec(groundCursorPosition),
        tower.position
      )
    ) {
      return towerId;
    }
  }

  return null;
}

function updatePlannedDeploymentAfterUpdatingCamera(
  resources: Resources
): void {
  const { battle, san, keys } = resources;
  const groundCursorPosition = getGroundCursorPosition(san);
  if (groundCursorPosition === null || !keys._1) {
    return;
  }

  const { plannedDeployment } = battle.data;

  if (plannedDeployment.start !== null) {
    const temp_fromStartToCursor = groundCursorPosition
      .clone()
      .sub(geoUtils.toThreeVec(plannedDeployment.start));
    const fromStartToCursorLength = temp_fromStartToCursor.length();
    const RANK_GAP = 8;
    const width = Math.max(1, Math.floor(fromStartToCursorLength / RANK_GAP));
    plannedDeployment.plannedUnit = getPlannedUnit({
      start: plannedDeployment.start,
      forward: geoUtils.fromThreeVec(
        temp_fromStartToCursor
          .clone()
          .normalize()
          .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2)
      ),
      dimensions: [width, 1],
      gap: [8, 8 * (Math.sqrt(3) / 2)],
      allegiance: Allegiance.Azuki,
    });
  }
}

function getPlannedUnit({
  start,
  forward,
  dimensions: [width, height],
  gap: [rightGap, backGap],
  allegiance,
}: {
  start: Triple;
  forward: Triple;
  dimensions: [number, number];
  gap: [number, number];
  allegiance: Allegiance;
}): PlannedUnit {
  const rightStep = geoUtils
    .toThreeVec(forward)
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    .multiplyScalar(rightGap);
  const backStep = geoUtils
    .toThreeVec(forward)
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
    .multiplyScalar(backGap);
  const soldiers: PlannedSoldier[] = [];
  for (let right = 0; right < width; ++right) {
    for (let back = 0; back < height; ++back) {
      const soldierPosition = geoUtils
        .toThreeVec(start)
        .clone()
        .add(rightStep.clone().multiplyScalar(right + 0.5 * (back & 1)))
        .add(backStep.clone().multiplyScalar(back));
      const soldier = getPlannedSoldier(
        soldierPosition.x,
        soldierPosition.y,
        soldierPosition.z
      );
      soldier.yRot = Math.atan2(forward[0], forward[2]);
      soldiers.push(soldier);
    }
  }

  return {
    order: { kind: UnitOrderKind.Advance },
    soldiers,
    forward,
    allegiance,
    areSoldiersStillBeingAdded: false,
  };
}

function getPlannedSoldier(x: number, y: number, z: number): PlannedSoldier {
  return {
    position: [x, y, z],
    health: 100,
    yRot: 0,
    assemblyPoint: [x, y, z],
  };
}
