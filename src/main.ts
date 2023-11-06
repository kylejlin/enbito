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

export function main(assets: Assets): void {
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

  let lastTime = Date.now();

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

  const playerGltf = cloneGltf(assets.azuki);
  const player = playerGltf.scene;
  player.position.set(0, 0, 0);
  const playerWalkClip = AnimationClip.findByName(
    playerGltf.animations,
    "Walk"
  );
  const playerStabClip = AnimationClip.findByName(
    playerGltf.animations,
    "Stab"
  );

  const playerMixer = new AnimationMixer(player);
  const playerWalkAction = playerMixer.clipAction(playerWalkClip);
  const playerStabAction = playerMixer.clipAction(playerStabClip);

  scene.add(player);

  const azukiUnits = [
    getAzukiUnit({
      start: new Vector3(0, 0, 100),
      forward: new Vector3(0, 0, 1).normalize(),
      dimensions: [10, 10],
      gap: [8, 8 * (Math.sqrt(3) / 2)],
      assets,
    }),
  ];
  for (const unit of azukiUnits) {
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

  tick();

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

  function tick(): void {
    const now = Date.now();
    const elapsedTime = now - lastTime;
    lastTime = now;
    cubeCamera.update(renderer, scene);
    render();

    player.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    player.rotateY(-(mouse.x - 0.5) * Math.PI * 2);

    if (keys.w) {
      playerWalkAction.play();

      playerStabAction.stop();

      player.translateZ((3 * -elapsedTime) / 1000);

      playerMixer.update((2 * elapsedTime) / 1000);
    } else if (keys.space) {
      playerStabAction.play();

      playerWalkAction.stop();

      playerMixer.update((0.5 * elapsedTime) / 1000);
    } else {
      playerWalkAction.stop();
      playerStabAction.stop();
    }

    dragonflyMixer.update((1 * elapsedTime) / 1000);
    dragonfly.translateZ((100 * -elapsedTime) / 1000);

    enemyMixer.update((1 * elapsedTime) / 1000);
    enemy.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    enemy.rotateY(
      Math.atan2(
        player.position.x - enemy.position.x,
        player.position.z - enemy.position.z
      ) + Math.PI
    );

    for (const unit of azukiUnits) {
      const { soldiers } = unit;
      for (const soldier of soldiers) {
        if (unit.isPreview) {
          continue;
        }

        soldier.walkAction.play();
        soldier.stabAction.stop();
        soldier.mixer.update(elapsedTime / 1000);
        soldier.gltf.scene.translateZ((1.5 * -elapsedTime) / 1000);
      }
    }

    if (
      (player.position.x - enemy.position.x) *
        (player.position.x - enemy.position.x) +
        (player.position.z - enemy.position.z) *
          (player.position.z - enemy.position.z) >
      1 * 1
    ) {
      enemyWalkAction.play();
      enemy.translateZ((1.5 * -elapsedTime) / 1000);
    } else {
      enemyWalkAction.stop();
    }

    camera.position.copy(player.position);
    camera.quaternion.copy(player.quaternion);
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
        if (i >= azukiUnits.length) {
          break;
        }
        if (azukiUnits[i].isPreview) {
          for (const soldier of azukiUnits[i].soldiers) {
            scene.remove(soldier.gltf.scene);
          }

          azukiUnits.splice(i, 1);
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
        const previewUnit = getAzukiUnit({
          start: pendingDeployment.start,
          forward: temp_fromStartToCursor
            .clone()
            .normalize()
            .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
          dimensions: [width, 1],
          gap: [RANK_GAP, 0],
          assets,
        });
        previewUnit.isPreview = true;
        azukiUnits.push(previewUnit);
        for (const soldier of previewUnit.soldiers) {
          scene.add(soldier.gltf.scene);
        }
        pendingDeployment.endWhenMostRecentPreviewWasCreated.copy(groundCursor);
      }
    }

    requestAnimationFrame(tick);
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
}

interface Soldier {
  gltf: GLTF;
  mixer: AnimationMixer;
  walkAction: AnimationAction;
  stabAction: AnimationAction;
}

function getAzukiUnit({
  start,
  forward,
  dimensions: [width, height],
  gap: [rightGap, backGap],
  assets,
}: {
  start: Vector3;
  forward: Vector3;
  dimensions: [number, number];
  gap: [number, number];
  assets: Assets;
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
      const soldier = getAzukiSoldier(
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
  };
}

function getAzukiSoldier(
  x: number,
  y: number,
  z: number,
  assets: Assets
): Soldier {
  const soldierGltf = cloneGltf(assets.azuki);
  const soldierScene = soldierGltf.scene;
  soldierScene.position.set(x, y, z);
  const walkClip = AnimationClip.findByName(soldierGltf.animations, "Walk");
  const stabClip = AnimationClip.findByName(soldierGltf.animations, "Stab");

  const mixer = new AnimationMixer(soldierScene);
  const walkAction = mixer.clipAction(walkClip);
  const stabAction = mixer.clipAction(stabClip);

  return { gltf: soldierGltf, mixer, walkAction, stabAction };
}
