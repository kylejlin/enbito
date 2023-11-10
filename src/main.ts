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
  Turn,
  Stab,
}

export function main(assets: Assets): void {
  let worldTime = Date.now();
  let lastWorldTime = worldTime;
  const MILLISECS_PER_TICK = 10;

  const mouse = { x: 0, y: 0, isLocked: false };
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
  const flyAction = dragonflyMixer.clipAction(flyClip);
  flyAction.timeScale = 5;
  flyAction.play();

  scene.add(dragonfly);
  dragonfly.position.set(30, 30, -600);
  dragonfly.rotateY(Math.PI);
  dragonfly.scale.multiplyScalar(0.3);
  // TODO: Delete END

  const player = (function (): Soldier {
    const playerGltf = cloneGltf(assets.azuki);
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
    };
  })();

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

  const enemyGltf = cloneGltf(assets.azuki);
  const enemy = enemyGltf.scene;
  enemy.position.set(3, 0, 0);
  const enemyWalkClip = AnimationClip.findByName(enemyGltf.animations, "Walk");

  const enemyMixer = new AnimationMixer(enemy);
  const enemyWalkAction = enemyMixer.clipAction(enemyWalkClip);
  enemyWalkAction.play();

  scene.add(enemy);

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
    player.gltf.scene.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    player.gltf.scene.rotateY(-(mouse.x - 0.5) * Math.PI * 2);
  }

  function tick(): void {
    const elapsedTimeInMillisecs = MILLISECS_PER_TICK;
    const elapsedTimeInSeconds = elapsedTimeInMillisecs / 1000;

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

    dragonflyMixer.update((1 * elapsedTimeInMillisecs) / 1000);
    dragonfly.translateZ((100 * -elapsedTimeInMillisecs) / 1000);

    enemyMixer.update((1 * elapsedTimeInMillisecs) / 1000);
    enemy.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    enemy.rotateY(
      Math.atan2(
        player.gltf.scene.position.x - enemy.position.x,
        player.gltf.scene.position.z - enemy.position.z
      ) + Math.PI
    );

    const ATTACK_RANGE_SQUARED = 8 ** 2;

    for (const unit of units) {
      if (unit.isPreview) {
        continue;
      }

      const { soldiers } = unit;
      const wasAnySoldierFighting = soldiers.some(
        (soldier) => soldier.attackTarget !== null
      );
      if (!wasAnySoldierFighting) {
        for (const soldier of soldiers) {
          soldier.walkAction.play();
          soldier.stabAction.stop();
          soldier.mixer.update(elapsedTimeInMillisecs / 1000);
          soldier.gltf.scene.translateZ((1.5 * -elapsedTimeInMillisecs) / 1000);

          for (const otherUnit of units) {
            if (otherUnit.allegiance === unit.allegiance) {
              continue;
            }

            for (const enemy of otherUnit.soldiers) {
              const distanceSquared =
                soldier.gltf.scene.position.distanceToSquared(
                  enemy.gltf.scene.position
                );
              if (distanceSquared <= ATTACK_RANGE_SQUARED) {
                // TODO: Choose closest instead of arbitrary one.
                soldier.attackTarget = enemy;
                soldier.walkAction.stop();
                soldier.stabAction.play();
                const difference = enemy.gltf.scene.position
                  .clone()
                  .sub(soldier.gltf.scene.position);
                soldier.gltf.scene.setRotationFromAxisAngle(
                  new Vector3(0, 1, 0),
                  Math.atan2(difference.x, difference.z) + Math.PI + 0.05
                );
              }
            }
          }
        }
      } else {
        for (const soldier of soldiers) {
          if (soldier.stabAction.time < soldier.stabClip.duration) {
            soldier.mixer.update(elapsedTimeInMillisecs / 1000);
            continue;
          }

          const { attackTarget } = soldier;
          if (attackTarget === null) {
            for (const otherUnit of units) {
              if (otherUnit.allegiance === unit.allegiance) {
                continue;
              }

              for (const enemy of otherUnit.soldiers) {
                const distanceSquared =
                  soldier.gltf.scene.position.distanceToSquared(
                    enemy.gltf.scene.position
                  );
                if (distanceSquared <= ATTACK_RANGE_SQUARED) {
                  // TODO: Choose closest instead of arbitrary one.
                  soldier.attackTarget = enemy;
                  soldier.walkAction.stop();
                  soldier.stabAction.play();
                  const difference = enemy.gltf.scene.position
                    .clone()
                    .sub(soldier.gltf.scene.position);
                  soldier.gltf.scene.setRotationFromAxisAngle(
                    new Vector3(0, 1, 0),
                    Math.atan2(difference.x, difference.z) + Math.PI + 0.05
                  );
                }
              }
            }

            continue;
          }

          if (soldier.attackTarget !== null) {
            soldier.attackTarget.health -= 60;
          }
        }
      }
    }

    if (
      (player.gltf.scene.position.x - enemy.position.x) *
        (player.gltf.scene.position.x - enemy.position.x) +
        (player.gltf.scene.position.z - enemy.position.z) *
          (player.gltf.scene.position.z - enemy.position.z) >
      1 * 1
    ) {
      enemyWalkAction.play();
      enemy.translateZ((1.5 * -elapsedTimeInMillisecs) / 1000);
    } else {
      enemyWalkAction.stop();
    }

    camera.position.copy(player.gltf.scene.position);
    camera.quaternion.copy(player.gltf.scene.quaternion);
    camera.translateY(5);
    camera.translateZ(2);
    camera.rotateX(-(mouse.y - 0.5) * Math.PI);

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
      enemy.position.copy(groundCursor);

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
        }
        pendingDeployment.endWhenMostRecentPreviewWasCreated.copy(groundCursor);
      }
    }
  }

  function oncePerFrameBeforeRender(): void {
    if (player.animation.kind === SoldierAnimationKind.Walk) {
      player.walkAction.play();

      player.stabAction.stop();

      player.mixer.setTime(player.animation.timeInSeconds);
    } else {
      player.walkAction.stop();
      player.stabAction.stop();
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

    // TODO
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
        assets
      );
      soldier.gltf.scene.rotateY(Math.atan2(forward.x, forward.z));
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

function getSoldier(x: number, y: number, z: number, assets: Assets): Soldier {
  const soldierGltf = cloneGltf(assets.azuki);
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
  };
}

function startOrContinueWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  assets: Assets
): void {
  const scaledWalkClipDuration = assets.azukiWalkClip.duration / timeScale;
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
  const scaledWalkClipDuration = assets.azukiWalkClip.duration / timeScale;
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
