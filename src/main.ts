import { Assets } from "./assets";
import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Quaternion,
  Vector3,
  MeshBasicMaterial,
  Mesh,
  MathUtils,
  ACESFilmicToneMapping,
  WebGLCubeRenderTarget,
  HalfFloatType,
  CubeCamera,
  PlaneGeometry,
  AnimationMixer,
  AnimationClip,
  AnimationAction,
  Raycaster,
  AmbientLight,
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import { cloneGltf } from "./cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

enum Allegiance {
  Azuki,
  Edamame,
}

enum SoldierAnimationKind {
  Idle,
  Walk,
  Stab,
}

interface Resources {
  assets: Assets;
  scene: Scene;
}

const TURN_SPEED_RAD_PER_SEC = Math.PI * 0.5;
const SPEAR_ATTACK_RANGE_SQUARED = 8 ** 2;
const STAB_DAMAGE = 60;
const STAB_COOLDOWN = 1;
const DRAGONFLY_SPEED = 30;

export function main(assets: Assets): void {
  let worldTime = Date.now();
  let lastWorldTime = worldTime;
  const MILLISECS_PER_TICK = 10;

  const mouse = { x: 0.5, y: 0.5, isLocked: false };
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

      if (isPlayerRidingDragonfly) {
        if (mouse.x < 0) {
          mouse.x = 0;
        }
        if (mouse.x > 1) {
          mouse.x = 1;
        }
      }
    }
  });

  const pendingDeployment = {
    start: new Vector3(0, 0, 0),
    endWhenMostRecentPreviewWasCreated: new Vector3(0, 0, 0),
    active: false,
  };

  let groundCursor: null | Vector3 = null;

  const keys = {
    w: false,
    space: false,
    _1: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
    if (e.key === " ") {
      keys.space = true;
    }
    if (e.key === "1") {
      const wasKey1Down = keys._1;
      keys._1 = true;
      trySetDeploymentStart(wasKey1Down);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
    if (e.key === " ") {
      keys.space = false;
    }
    if (e.key === "1") {
      keys._1 = false;
      trySetDeploymentEnd();
    }
  });

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    57,
    window.innerWidth / window.innerHeight
  );

  const renderer = new WebGLRenderer();
  renderer.useLegacyLights = false;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeCameraAndRerender();
  window.addEventListener("resize", resizeCameraAndRerender);

  document.body.appendChild(renderer.domElement);

  const cameraQuat = new Quaternion();
  cameraQuat.setFromAxisAngle(new Vector3(1, 0, 0), (3 * Math.PI) / 2);
  camera.setRotationFromQuaternion(cameraQuat);

  camera.position.set(0, 2, 0);

  const texture = assets.grass.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const grasslikeSize = 100000;
  texture.repeat.set(grasslikeSize, grasslikeSize);
  const grasslike = new Mesh(
    new PlaneGeometry(grasslikeSize, grasslikeSize),
    new MeshBasicMaterial({ map: texture })
  );
  grasslike.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  grasslike.position.set(-1, 0, -1);
  scene.add(grasslike);

  const cubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeRenderTarget.texture.type = HalfFloatType;

  const cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  // TODO: Delete START
  const dragonflyGltf = cloneGltf(assets.dragonfly);
  const dragonfly = dragonflyGltf.scene;
  dragonfly.position.set(0, 0, 0);
  const flyClip = AnimationClip.findByName(dragonflyGltf.animations, "Fly");

  const dragonflyMixer = new AnimationMixer(dragonfly);
  const dragonflyFlyAction = dragonflyMixer.clipAction(flyClip);
  dragonflyFlyAction.timeScale = 5;
  dragonflyFlyAction.play();

  scene.add(dragonfly);
  dragonfly.position.set(30, 30, -600);
  dragonfly.rotateY(Math.PI);
  dragonfly.scale.multiplyScalar(0.6);
  // TODO: Delete END

  const playerDragonflyGltf = cloneGltf(assets.dragonfly);
  const playerDragonfly = playerDragonflyGltf.scene;
  playerDragonfly.position.set(0, 0, 0);
  scene.add(playerDragonfly);
  playerDragonfly.position.set(0, 30, 0);
  playerDragonfly.scale.multiplyScalar(0.6);

  const playerDragonflyMixer = new AnimationMixer(playerDragonfly);
  const playerDragonflyFlyAction = playerDragonflyMixer.clipAction(flyClip);
  playerDragonflyFlyAction.timeScale = 5;
  playerDragonflyFlyAction.play();

  const player = (function (): Soldier {
    const playerGltf = cloneGltf(assets.azukiSpear);
    const playerScene = playerGltf.scene;
    playerScene.position.set(0, 0, 0);
    const playerWalkClip = AnimationClip.findByName(
      playerGltf.animations,
      "Walk"
    );
    const playerStabClip = AnimationClip.findByName(
      playerGltf.animations,
      "Stab"
    );

    const playerMixer = new AnimationMixer(playerScene);
    const playerWalkAction = playerMixer.clipAction(playerWalkClip);
    const playerStabAction = playerMixer.clipAction(playerStabClip);
    playerWalkAction.timeScale = 2;
    return {
      gltf: playerGltf,
      animation: {
        kind: SoldierAnimationKind.Idle,
        timeInSeconds: 0,
      },
      mixer: playerMixer,
      walkClip: playerWalkClip,
      walkAction: playerWalkAction,
      stabClip: playerStabClip,
      stabAction: playerStabAction,
      attackTarget: null,
      health: 100,
      yRot: 0,
    };
  })();
  let isPlayerRidingDragonfly = false;

  scene.add(player.gltf.scene);

  const units = [
    getUnit({
      start: new Vector3(0, 0, 100),
      forward: new Vector3(0, 0, 1).normalize(),
      dimensions: [10, 10],
      gap: [8, 8 * (Math.sqrt(3) / 2)],
      assets,
      allegiance: Allegiance.Azuki,
    }),

    getUnit({
      start: new Vector3(100, 0, -100),
      forward: new Vector3(0, 0, -1).normalize(),
      dimensions: [10, 10],
      gap: [8, 8 * (Math.sqrt(3) / 2)],
      assets,
      allegiance: Allegiance.Edamame,
    }),
  ];
  for (const unit of units) {
    for (const soldier of unit.soldiers) {
      scene.add(soldier.gltf.scene);
    }
  }

  const towers = [
    getBannerTower({
      position: new Vector3(0, 0, -100),
      allegiance: Allegiance.Edamame,
      assets,
    }),
    getBannerTower({
      position: new Vector3(100, 0, -100),
      allegiance: Allegiance.Edamame,
      assets,
    }),
    getBannerTower({
      position: new Vector3(0, 0, 100),
      allegiance: Allegiance.Azuki,
      assets,
    }),
    getBannerTower({
      position: new Vector3(100, 0, 100),
      allegiance: Allegiance.Azuki,
      assets,
    }),
  ];
  for (const tower of towers) {
    scene.add(tower.gltf.scene);
  }

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

  scene.add(cursor);

  scene.add(new AmbientLight(0x888888, 10));

  const resources: Resources = { assets, scene };

  addSky();
  addEnvironment();

  onAnimationFrame();

  function resizeCameraAndRerender(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  function addSky(): void {
    // Based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_sky.html
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const sun = new Vector3();

    const effectController = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
      exposure: renderer.toneMappingExposure,
    };

    function onControllerChange() {
      const uniforms = sky.material.uniforms;
      uniforms["turbidity"].value = effectController.turbidity;
      uniforms["rayleigh"].value = effectController.rayleigh;
      uniforms["mieCoefficient"].value = effectController.mieCoefficient;
      uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

      const phi = MathUtils.degToRad(90 - effectController.elevation);
      const theta = MathUtils.degToRad(effectController.azimuth);

      sun.setFromSphericalCoords(1, phi, theta);

      uniforms["sunPosition"].value.copy(sun);

      renderer.toneMappingExposure = effectController.exposure;
      renderer.render(scene, camera);
    }

    onControllerChange();
  }

  function onAnimationFrame(): void {
    const now = Date.now();
    worldTime = now;

    oncePerFrameBeforeTicks();

    while (lastWorldTime + MILLISECS_PER_TICK <= worldTime) {
      tick();
      lastWorldTime += MILLISECS_PER_TICK;
    }

    oncePerFrameBeforeRender();

    cubeCamera.update(renderer, scene);
    render();

    requestAnimationFrame(onAnimationFrame);
  }

  function oncePerFrameBeforeTicks(): void {
    if (isPlayerRidingDragonfly) {
      // TODO
    } else {
      player.yRot = -(mouse.x - 0.5) * Math.PI * 2;
    }
  }

  function tick(): void {
    const elapsedTimeInMillisecs = MILLISECS_PER_TICK;
    const elapsedTimeInSeconds = elapsedTimeInMillisecs / 1000;

    if (isPlayerRidingDragonfly) {
      // TODO
      let wrappedMouseX = mouse.x;
      while (wrappedMouseX > 1) {
        wrappedMouseX -= 1;
      }
      while (wrappedMouseX < -1) {
        wrappedMouseX += 1;
      }

      player.yRot +=
        0.5 * elapsedTimeInSeconds * (-(wrappedMouseX - 0.5) * Math.PI * 2);

      playerDragonfly.quaternion.setFromAxisAngle(
        new Vector3(0, 1, 0),
        player.yRot
      );
      playerDragonfly.rotateZ(-(mouse.x - 0.5) * Math.PI);

      playerDragonfly.translateZ(DRAGONFLY_SPEED * -elapsedTimeInSeconds);

      player.gltf.scene.position.copy(playerDragonfly.position);
      player.gltf.scene.quaternion.copy(playerDragonfly.quaternion);
      player.gltf.scene.translateZ(-0.3);
    } else {
      if (keys.w) {
        startOrContinueWalkingAnimation(
          elapsedTimeInSeconds,
          player.animation,
          player.walkAction.timeScale,
          assets
        );
      } else {
        stopWalkingAnimation(
          elapsedTimeInSeconds,
          player.animation,
          player.walkAction.timeScale,
          assets
        );
      }

      if (player.animation.kind === SoldierAnimationKind.Walk) {
        player.gltf.scene.translateZ(-3 * elapsedTimeInSeconds);
      }
    }

    dragonflyMixer.update(elapsedTimeInSeconds);
    dragonfly.translateZ(DRAGONFLY_SPEED * -elapsedTimeInSeconds);

    playerDragonflyMixer.update(elapsedTimeInSeconds);

    cursorMixer.update((1 * elapsedTimeInMillisecs) / 1000);
    cursor.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    cursor.rotateY(
      Math.atan2(
        player.gltf.scene.position.x - cursor.position.x,
        player.gltf.scene.position.z - cursor.position.z
      )
    );

    tickUnits(elapsedTimeInSeconds, units, resources);
    tickBannerTowers(elapsedTimeInSeconds, units, towers, resources);
  }

  function oncePerFrameBeforeRender(): void {
    updateThreeJsProperties(player);

    for (const unit of units) {
      for (const soldier of unit.soldiers) {
        updateThreeJsProperties(soldier);
      }
    }

    if (isPlayerRidingDragonfly) {
      // TODO
      camera.position.copy(player.gltf.scene.position);
      camera.quaternion.copy(player.gltf.scene.quaternion);
      camera.translateY(5);
      camera.translateZ(10);
      camera.rotateX(-(mouse.y - 0.5) * Math.PI);
    } else {
      camera.position.copy(player.gltf.scene.position);
      camera.quaternion.copy(player.gltf.scene.quaternion);
      camera.translateY(5);
      camera.translateZ(2);
      camera.rotateX(-(mouse.y - 0.5) * Math.PI);
    }

    const raycaster = new Raycaster();
    raycaster.set(
      camera.position,
      new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    );
    const hits = raycaster.intersectObject(grasslike, true);
    if (hits.length === 0) {
      groundCursor = null;
    } else {
      groundCursor = hits[0].point;
    }

    if (
      groundCursor === null ||
      !pendingDeployment.active ||
      !groundCursor.equals(pendingDeployment.endWhenMostRecentPreviewWasCreated)
    ) {
      for (let i = 0; true; ) {
        if (i >= units.length) {
          break;
        }
        if (units[i].isPreview) {
          for (const soldier of units[i].soldiers) {
            scene.remove(soldier.gltf.scene);
          }

          units.splice(i, 1);
        } else {
          ++i;
        }
      }
    }

    if (groundCursor !== null) {
      cursor.position.copy(groundCursor);

      if (
        pendingDeployment.active &&
        !groundCursor.equals(
          pendingDeployment.endWhenMostRecentPreviewWasCreated
        )
      ) {
        const temp_fromStartToCursor = groundCursor
          .clone()
          .sub(pendingDeployment.start);
        const fromStartToCursorLength = temp_fromStartToCursor.length();
        const RANK_GAP = 8;
        const width = Math.max(
          1,
          Math.floor(fromStartToCursorLength / RANK_GAP)
        );
        const previewUnit = getUnit({
          start: pendingDeployment.start,
          forward: temp_fromStartToCursor
            .clone()
            .normalize()
            .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
          dimensions: [width, 1],
          gap: [RANK_GAP, 0],
          assets,
          allegiance: Allegiance.Azuki,
        });
        previewUnit.isPreview = true;
        units.push(previewUnit);
        for (const soldier of previewUnit.soldiers) {
          scene.add(soldier.gltf.scene);
          updateThreeJsProperties(soldier);
        }
        pendingDeployment.endWhenMostRecentPreviewWasCreated.copy(groundCursor);
      }
    }
  }

  function updateThreeJsProperties(soldier: Soldier): void {
    if (soldier.animation.kind === SoldierAnimationKind.Walk) {
      soldier.walkAction.play();

      soldier.stabAction.stop();

      soldier.mixer.setTime(soldier.animation.timeInSeconds);
    } else if (soldier.animation.kind === SoldierAnimationKind.Stab) {
      soldier.stabAction.play();

      soldier.walkAction.stop();

      soldier.mixer.setTime(soldier.animation.timeInSeconds);
    } else {
      soldier.walkAction.stop();
      soldier.stabAction.stop();
    }

    if (!(soldier === player && isPlayerRidingDragonfly)) {
      soldier.gltf.scene.quaternion.setFromAxisAngle(
        new Vector3(0, 1, 0),
        soldier.yRot
      );
    }
  }

  function addEnvironment(): void {
    scene.environment = assets.environment;
  }

  function trySetDeploymentStart(wasKey1Down: boolean): void {
    if (groundCursor === null || wasKey1Down) {
      return;
    }

    pendingDeployment.start.copy(groundCursor);
    pendingDeployment.active = true;
  }

  function trySetDeploymentEnd(): void {
    if (!pendingDeployment.active) {
      return;
    }

    if (groundCursor === null) {
      return;
    }

    pendingDeployment.active = false;

    const temp_fromStartToCursor = groundCursor
      .clone()
      .sub(pendingDeployment.start);
    const fromStartToCursorLength = temp_fromStartToCursor.length();
    const RANK_GAP = 8;
    const width = Math.max(1, Math.floor(fromStartToCursorLength / RANK_GAP));
    const previewUnit = getUnit({
      start: pendingDeployment.start,
      forward: temp_fromStartToCursor
        .clone()
        .normalize()
        .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
      dimensions: [width, 1],
      gap: [RANK_GAP, 0],
      assets,
      allegiance: Allegiance.Azuki,
    });
    units.push(previewUnit);
    for (const soldier of previewUnit.soldiers) {
      scene.add(soldier.gltf.scene);
      updateThreeJsProperties(soldier);
    }
    pendingDeployment.endWhenMostRecentPreviewWasCreated.copy(groundCursor);
  }
}

interface Unit {
  soldiers: Soldier[];
  forward: Vector3;
  isPreview: boolean;
  allegiance: Allegiance;
}

interface Soldier {
  gltf: GLTF;
  animation: SoldierAnimationState;
  mixer: AnimationMixer;
  walkClip: AnimationClip;
  walkAction: AnimationAction;
  stabClip: AnimationClip;
  stabAction: AnimationAction;
  attackTarget: null | Soldier;
  health: number;
  yRot: number;
}

interface BannerTower {
  gltf: GLTF;
  isPreview: boolean;
  allegiance: Allegiance;
}

interface SoldierAnimationState {
  kind: SoldierAnimationKind;
  timeInSeconds: number;
}

function getUnit({
  start,
  forward,
  dimensions: [width, height],
  gap: [rightGap, backGap],
  assets,
  allegiance,
}: {
  start: Vector3;
  forward: Vector3;
  dimensions: [number, number];
  gap: [number, number];
  assets: Assets;
  allegiance: Allegiance;
}): Unit {
  const rightStep = forward
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    .multiplyScalar(rightGap);
  const backStep = forward
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
    .multiplyScalar(backGap);
  const soldiers: Soldier[] = [];
  for (let right = 0; right < width; ++right) {
    for (let back = 0; back < height; ++back) {
      const soldierPosition = start
        .clone()
        .add(rightStep.clone().multiplyScalar(right + 0.5 * (back & 1)))
        .add(backStep.clone().multiplyScalar(back));
      const soldier = getSoldier(
        soldierPosition.x,
        soldierPosition.y,
        soldierPosition.z,
        allegiance,
        assets
      );
      soldier.yRot = Math.atan2(forward.x, forward.z);
      soldiers.push(soldier);
    }
  }
  return {
    soldiers,
    forward,
    isPreview: false,
    allegiance,
  };
}

function getSoldier(
  x: number,
  y: number,
  z: number,
  allegiance: Allegiance,
  assets: Assets
): Soldier {
  const soldierGltf =
    allegiance === Allegiance.Azuki
      ? cloneGltf(assets.azukiSpear)
      : cloneGltf(assets.edamameSpear);
  const soldierScene = soldierGltf.scene;
  soldierScene.position.set(x, y, z);
  const walkClip = AnimationClip.findByName(soldierGltf.animations, "Walk");
  const stabClip = AnimationClip.findByName(soldierGltf.animations, "Stab");

  const mixer = new AnimationMixer(soldierScene);
  const walkAction = mixer.clipAction(walkClip);
  const stabAction = mixer.clipAction(stabClip);
  stabAction.timeScale = 0.5;

  return {
    gltf: soldierGltf,
    animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
    mixer,
    walkClip,
    walkAction,
    stabClip,
    stabAction,
    attackTarget: null,
    health: 100,
    yRot: 0,
  };
}

function getBannerTower({
  position,
  allegiance,
  assets,
}: {
  position: Vector3;

  allegiance: Allegiance;
  assets: Assets;
}): BannerTower {
  const gltf = cloneGltf(assets.azukiBannerTower);
  gltf.scene.position.copy(position);
  return {
    gltf,
    isPreview: false,
    allegiance,
  };
}

function startOrContinueWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  assets: Assets
): void {
  const scaledWalkClipDuration = assets.azukiSpearWalkClip.duration / timeScale;
  if (animation.kind !== SoldierAnimationKind.Walk) {
    animation.kind = SoldierAnimationKind.Walk;
    animation.timeInSeconds = 0;
  } else {
    animation.timeInSeconds =
      (animation.timeInSeconds + elapsedTimeInSeconds) % scaledWalkClipDuration;
  }
}

function stopWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  assets: Assets
): void {
  const scaledWalkClipDuration = assets.azukiSpearWalkClip.duration / timeScale;
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
  assets: Assets
): void {
  const scaledWalkClipDuration = assets.azukiSpearWalkClip.duration / timeScale;
  if (animation.kind === SoldierAnimationKind.Walk) {
    const halfwayPoint = 0.5 * scaledWalkClipDuration;
    const reachesHalfwayPointThisTick =
      animation.timeInSeconds < halfwayPoint &&
      animation.timeInSeconds + elapsedTimeInSeconds >= halfwayPoint;
    const reachesEndThisTick =
      animation.timeInSeconds + elapsedTimeInSeconds >= scaledWalkClipDuration;

    if (reachesHalfwayPointThisTick || reachesEndThisTick) {
      animation.kind = SoldierAnimationKind.Stab;
      animation.timeInSeconds = 0;
    } else {
      animation.timeInSeconds += elapsedTimeInSeconds;
    }
  }
}

function continueStabThenIdleAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  assets: Assets
): void {
  animation.timeInSeconds = animation.timeInSeconds + elapsedTimeInSeconds;
  const scaledStabClipDuration = assets.azukiSpearStabClip.duration / timeScale;
  if (animation.timeInSeconds >= scaledStabClipDuration) {
    animation.kind = SoldierAnimationKind.Idle;
    animation.timeInSeconds = animation.timeInSeconds - scaledStabClipDuration;
  }
}

function continueIdleThenStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  assets: Assets
): void {
  animation.timeInSeconds += elapsedTimeInSeconds;
  if (animation.timeInSeconds >= STAB_COOLDOWN) {
    animation.kind = SoldierAnimationKind.Stab;
    animation.timeInSeconds = animation.timeInSeconds - STAB_COOLDOWN;
  }
}

function tickUnits(
  elapsedTimeInSeconds: number,
  units: Unit[],
  { assets, scene }: Resources
): void {
  for (const unit of units) {
    const { soldiers } = unit;
    for (let i = 0; i < soldiers.length; ++i) {
      const soldier = soldiers[i];
      if (soldier.health <= 0) {
        scene.remove(soldier.gltf.scene);
        soldiers.splice(i, 1);
        --i;
        continue;
      }
    }
  }

  for (const unit of units) {
    if (unit.isPreview) {
      continue;
    }

    const { soldiers } = unit;

    const wasAnySoldierFighting = soldiers.some(
      (soldier) => soldier.attackTarget !== null
    );
    if (!wasAnySoldierFighting) {
      const forwardAngle = Math.atan2(unit.forward.x, unit.forward.z);
      for (const soldier of soldiers) {
        const nearestEnemy = getNearestEnemy(
          soldier,
          unit,
          units,
          SPEAR_ATTACK_RANGE_SQUARED
        );
        if (nearestEnemy !== null) {
          soldier.attackTarget = nearestEnemy;
        } else {
          const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
          soldier.yRot = limitTurn(soldier.yRot, forwardAngle, radiansPerTick);
          if (soldier.yRot === forwardAngle) {
            startOrContinueWalkingAnimation(
              elapsedTimeInSeconds,
              soldier.animation,
              1,
              assets
            );
            soldier.gltf.scene.translateZ(-1.5 * elapsedTimeInSeconds);
          }
        }
      }
    } else {
      for (const soldier of soldiers) {
        if (soldier.attackTarget !== null && soldier.attackTarget.health <= 0) {
          soldier.attackTarget = null;
        }

        if (soldier.attackTarget === null) {
          const nearestEnemy = getNearestEnemy(
            soldier,
            unit,
            units,
            SPEAR_ATTACK_RANGE_SQUARED
          );
          if (nearestEnemy !== null) {
            soldier.attackTarget = nearestEnemy;
          }
        }

        if (soldier.animation.kind === SoldierAnimationKind.Walk) {
          stopWalkingAndStartStabAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            1,
            assets
          );
        }

        if (soldier.attackTarget !== null) {
          const difference = soldier.attackTarget.gltf.scene.position
            .clone()
            .sub(soldier.gltf.scene.position);
          const desiredYRot =
            Math.atan2(difference.x, difference.z) + Math.PI + 0.05;
          const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
          soldier.yRot = limitTurn(soldier.yRot, desiredYRot, radiansPerTick);

          if (soldier.animation.kind === SoldierAnimationKind.Stab) {
            continueStabThenIdleAnimation(
              elapsedTimeInSeconds,
              soldier.animation,
              soldier.stabAction.timeScale,
              assets
            );
            if (
              (soldier.animation.kind as SoldierAnimationKind) ===
              SoldierAnimationKind.Idle
            ) {
              soldier.attackTarget.health -= STAB_DAMAGE;
            }
          } else if (soldier.animation.kind === SoldierAnimationKind.Idle) {
            continueIdleThenStabAnimation(
              elapsedTimeInSeconds,
              soldier.animation,
              assets
            );
          }
        }
      }
    }
  }
}

function getNearestEnemy(
  soldier: Soldier,
  soldierUnit: Unit,
  units: Unit[],
  rangeSquared: number
): null | Soldier {
  let nearestEnemy: Soldier | null = null;
  let nearestDistanceSquared = Infinity;
  for (const unit of units) {
    if (unit.allegiance === soldierUnit.allegiance || unit.isPreview) {
      continue;
    }

    for (const enemy of unit.soldiers) {
      const distSq = soldier.gltf.scene.position.distanceToSquared(
        enemy.gltf.scene.position
      );
      if (distSq < nearestDistanceSquared) {
        nearestEnemy = enemy;
        nearestDistanceSquared = distSq;
      }
    }
  }

  if (nearestDistanceSquared > rangeSquared) {
    return null;
  }

  return nearestEnemy;
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
  units: Unit[],
  towers: BannerTower[],
  { assets, scene }: Resources
): void {
  const teamsWithATower: Set<Allegiance> = new Set();

  for (const tower of towers) {
    if (tower.isPreview) {
      continue;
    }

    let uniqueOccupier: typeof UNOCCUPIED | typeof CONTESTED | Allegiance =
      UNOCCUPIED;

    for (const unit of units) {
      if (
        uniqueOccupier === CONTESTED ||
        uniqueOccupier === unit.allegiance ||
        unit.isPreview
      ) {
        break;
      }

      const { soldiers } = unit;
      for (const soldier of soldiers) {
        if (
          inTowerTerritory(
            soldier.gltf.scene.position,
            tower.gltf.scene.position
          )
        ) {
          if (uniqueOccupier === UNOCCUPIED) {
            uniqueOccupier = unit.allegiance;
          } else if (uniqueOccupier !== unit.allegiance) {
            uniqueOccupier = CONTESTED;
            break;
          }
        }
      }
    }

    if (uniqueOccupier !== UNOCCUPIED && uniqueOccupier !== CONTESTED) {
      // TODO
      if (tower.allegiance !== uniqueOccupier) {
        console.log("conquered");
      }
      // END TODO

      tower.allegiance = uniqueOccupier;
    }

    teamsWithATower.add(tower.allegiance);
  }

  if (teamsWithATower.size === 1) {
    for (const winningTeam of Array.from(teamsWithATower.keys())) {
      // TODO
      console.log(
        winningTeam === Allegiance.Azuki ? "Azuki wins!" : "Edamame wins!"
      );
      alert(winningTeam === Allegiance.Azuki ? "Azuki wins!" : "Edamame wins!");
    }
  }
}

function inTowerTerritory(
  possibleOccupierPosition: Vector3,
  towerPosition: Vector3
): boolean {
  const localX = possibleOccupierPosition.x - towerPosition.x;
  const localZ = possibleOccupierPosition.z - towerPosition.z;
  return (
    possibleOccupierPosition.y < 1 &&
    -10 <= localX &&
    localX <= 10 &&
    -10 <= localZ &&
    localZ <= 10
  );
}
