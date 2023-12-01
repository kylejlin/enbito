import { Assets, ModelConstants } from "./assets";
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
  Object3D,
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import { cloneGltf } from "./cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Allegiance,
  BattleStateData,
  King,
  Orientation,
  Ref,
  Soldier,
  SoldierAnimationKind,
  SoldierAnimationState,
  Triple,
  Unit,
  UnitOrderKind,
} from "./battleStateData";
import { San, getDefaultSanData } from "./san";
import { BattleState } from "./battleState";
import { getDefaultBattleState } from "./getBattleState";
import * as geoUtils from "./geoUtils";

function getDummyVector3(): Vector3 {
  return new Vector3();
}

interface Resources {
  assets: Assets;

  mouse: MouseState;
  keys: KeySet;

  battle: BattleState;

  groundCursor: null | Triple;

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
const SOLDIER_EXPLOSION_DURATION = 1;
const SOLDIER_EXPLOSION_FRAME_COUNT = 29;
const SLASH_DAMAGE = 40;
const SOLDIER_DEPLOYMENT_DELAY_SECONDS = 1;
const ASSEMBLING_TROOP_SPEEDUP_FACTOR = 2;
const MAX_LANDING_SPEED = 30;
const DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED = 5 ** 2;
const DRAGONFLY_MIN_SPEED = 5;

let hasAlerted = false;
function alertOnceAfterDelay(message: string): void {
  if (!hasAlerted) {
    hasAlerted = true;
    setTimeout(() => alert(message), 2e3);
  }
}

export function main(assets: Assets): void {
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

      if (resources.battle.getAzukiKing().dragonfly.isBeingRidden) {
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

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    57,
    window.innerWidth / window.innerHeight,
    undefined,
    10000
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

  scene.add(cursor);

  scene.add(new AmbientLight(0x888888, 10));

  const resources: Resources = {
    battle: new BattleState(getDefaultBattleState()),
    san: new San(getDefaultSanData(assets)),
    mouse,
    keys,
    groundCursor: null,
    assets,
  };

  const azukiKing = resources.battle.getAzukiKing();
  const edamameKing = resources.battle.getEdamameKing();

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

    updateThreeScene();
    render();

    requestAnimationFrame(onAnimationFrame);
  }

  function oncePerFrameBeforeTicks(): void {
    if (azukiKing.dragonfly.isBeingRidden) {
      // TODO
    } else {
      azukiKing.yRot = -(mouse.x - 0.5) * Math.PI * 2;
    }
  }

  function tick(): void {
    const elapsedTimeInMillisecs = MILLISECS_PER_TICK;
    const elapsedTimeInSeconds = elapsedTimeInMillisecs / 1000;

    if (azukiKing.dragonfly.isBeingRidden) {
      if (azukiKing.dragonfly.isLanding) {
        if (
          azukiKing.dragonfly.position[1] <= 2.5 &&
          azukiKing.dragonfly.speed < 5
        ) {
          azukiKing.dragonfly.dismountTimer -= elapsedTimeInSeconds;
          if (azukiKing.dragonfly.dismountTimer <= 0) {
            azukiKing.dragonfly.isBeingRidden = false;
            azukiKing.dragonfly.isLanding = false;
            azukiKing.position[1] = 0;
          }
        } else {
          azukiKing.dragonfly.orientation.yaw +=
            0.5 *
            elapsedTimeInSeconds *
            (azukiKing.dragonfly.orientation.roll * 2);
          azukiKing.dragonfly.orientation.pitch = limitTurn(
            azukiKing.dragonfly.orientation.pitch,
            0,
            0.5 * Math.PI * elapsedTimeInSeconds
          );
          azukiKing.dragonfly.orientation.roll = limitTurn(
            azukiKing.dragonfly.orientation.roll,
            0,
            0.2 * Math.PI * elapsedTimeInSeconds
          );

          if (
            azukiKing.dragonfly.orientation.pitch === 0 &&
            azukiKing.dragonfly.orientation.roll === 0
          ) {
            azukiKing.dragonfly.speed = Math.max(
              0,
              azukiKing.dragonfly.speed * 0.6 ** elapsedTimeInSeconds
            );
            azukiKing.dragonfly.position[1] = Math.max(
              2.5,
              azukiKing.dragonfly.position[1] * 0.7 ** elapsedTimeInSeconds
            );
          }

          azukiKing.yRot = azukiKing.dragonfly.orientation.yaw;

          // player.dragonfly.gltf.scene.quaternion.setFromAxisAngle(
          //   new Vector3(0, 1, 0),
          //   player.yRot
          // );
          // player.dragonfly.gltf.scene.rotateX(player.dragonfly.pitch);
          // player.dragonfly.gltf.scene.rotateZ(player.dragonfly.roll);

          geoUtils.translateZ(
            azukiKing.dragonfly.position,
            azukiKing.dragonfly.orientation,
            azukiKing.dragonfly.speed * -elapsedTimeInSeconds
          );

          // player.gltf.scene.position.copy(player.dragonfly.gltf.scene.position);
          // player.gltf.scene.quaternion.copy(
          //   player.dragonfly.gltf.scene.quaternion
          // );
          // player.gltf.scene.translateZ(-0.3);
        }
      } else {
        // TODO
        let wrappedMouseX = mouse.x;
        while (wrappedMouseX > 1) {
          wrappedMouseX -= 1;
        }
        while (wrappedMouseX < -1) {
          wrappedMouseX += 1;
        }

        azukiKing.dragonfly.orientation.roll = -(mouse.x - 0.5) * Math.PI;
        azukiKing.dragonfly.orientation.yaw +=
          0.5 *
          elapsedTimeInSeconds *
          (azukiKing.dragonfly.orientation.roll * 2);
        azukiKing.dragonfly.orientation.pitch = -(mouse.y - 0.5) * Math.PI;

        azukiKing.yRot = azukiKing.dragonfly.orientation.yaw;

        // azukiKing.dragonfly.gltf.scene.quaternion.setFromAxisAngle(
        //   new Vector3(0, 1, 0),
        //   azukiKing.yRot
        // );
        // azukiKing.dragonfly.gltf.scene.rotateX(azukiKing.dragonfly.pitch);
        // azukiKing.dragonfly.gltf.scene.rotateZ(azukiKing.dragonfly.roll);

        geoUtils.translateZ(
          azukiKing.dragonfly.position,
          azukiKing.dragonfly.orientation,
          azukiKing.dragonfly.speed * -elapsedTimeInSeconds
        );

        // azukiKing.gltf.scene.position.copy(
        //   azukiKing.dragonfly.gltf.scene.position
        // );
        // azukiKing.gltf.scene.quaternion.copy(
        //   azukiKing.dragonfly.gltf.scene.quaternion
        // );
        // azukiKing.gltf.scene.translateZ(-0.3);

        if (
          azukiKing.dragonfly.position[1] < 10 &&
          azukiKing.dragonfly.speed <= MAX_LANDING_SPEED &&
          keys.v
        ) {
          azukiKing.dragonfly.isLanding = true;
          azukiKing.dragonfly.dismountTimer = 1.5;
        }
      }
    } else {
      if (keys.w) {
        startOrContinueWalkingAnimation(
          elapsedTimeInSeconds,
          azukiKing.animation,
          assets.mcon
        );
      } else {
        stopWalkingAnimation(
          elapsedTimeInSeconds,
          azukiKing.animation,
          assets.mcon
        );
      }

      if (
        azukiKing.animation.kind === SoldierAnimationKind.Slash ||
        (keys.space && azukiKing.animation.kind === SoldierAnimationKind.Idle)
      ) {
        const slashActionTimeScale = 1;
        const finishesSlashCycleThisTick =
          azukiKing.animation.timeInSeconds + elapsedTimeInSeconds >=
          assets.azukiKingSlashClip.duration / slashActionTimeScale;
        const dealsDamageThisTick = startOrContinueSlashAnimation(
          elapsedTimeInSeconds,
          azukiKing.animation,
          assets.mcon
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
          { yaw: azukiKing.yRot, pitch: 0, roll: 0 },
          -3 * elapsedTimeInSeconds
        );
      }
    }

    dragonflyMixer.update(elapsedTimeInSeconds);
    dragonfly.translateZ(30 * -elapsedTimeInSeconds);

    // azukiKing.dragonfly.mixer.update(elapsedTimeInSeconds);

    cursorMixer.update((1 * elapsedTimeInMillisecs) / 1000);
    cursor.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    cursor.rotateY(
      Math.atan2(
        azukiKing.position[0] - cursor.position.x,
        azukiKing.position[2] - cursor.position.z
      )
    );

    tickKings(elapsedTimeInSeconds, resources);
    tickPlannedDeployment(elapsedTimeInSeconds, resources);
    tickUnits(elapsedTimeInSeconds, resources);
    tickBannerTowers(elapsedTimeInSeconds, resources);
    tickSoldierExplosions(elapsedTimeInSeconds, resources);
  }

  function oncePerFrameBeforeRender(): void {
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
  }

  function updateThreeScene(): void {
    cubeCamera.update(renderer, scene);
  }

  function addEnvironment(): void {
    scene.environment = assets.environment;
  }

  function trySetDeploymentStart(wasKey1Down: boolean): void {
    if (resources.groundCursor === null || wasKey1Down) {
      return;
    }

    resources.battle.data.plannedDeployment.start = geoUtils.cloneTriple(
      resources.groundCursor
    );
  }

  function trySetDeploymentEnd(): void {
    //   if (
    //     !(plannedDeployment.start !== null && resources.groundCursor !== null)
    //   ) {
    //     return;
    //   }
    //   if (plannedDeployment.setUnitId === null) {
    //     const temp_fromStartToCursor = resources.groundCursor
    //       .clone()
    //       .sub(plannedDeployment.start);
    //     const fromStartToCursorLength = temp_fromStartToCursor.length();
    //     const RANK_GAP = 8;
    //     const width = Math.max(1, Math.floor(fromStartToCursorLength / RANK_GAP));
    //     plannedDeployment.setUnitId = getUnit({
    //       start: plannedDeployment.start,
    //       forward: temp_fromStartToCursor
    //         .clone()
    //         .normalize()
    //         .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
    //       dimensions: [width, 1],
    //       gap: [RANK_GAP, 0],
    //       assets,
    //       allegiance: Allegiance.Azuki,
    //     });
    //     for (const soldier of plannedDeployment.setUnit.soldiers) {
    //       scene.add(soldier.gltf.scene);
    //       updateThreeJsProperties(soldier);
    //     }
    //     plannedDeployment.start = null;
    //   } else {
    //     // TODO
    //     // For now, setting a second unit is a no-op.
    //     plannedDeployment.start = null;
    //   }
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

const STAB_DAMAGE_POINT_LOCATION_FACTOR = 4 / 8;

/** Returns whether the animation crosses the damage point during this tick. */
function continueStabThenIdleAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  assets: Assets
): boolean {
  const scaledStabClipDuration = assets.azukiSpearStabClip.duration / timeScale;
  const damageTime = scaledStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR;
  const dealsDamageThisTick =
    animation.timeInSeconds < damageTime &&
    animation.timeInSeconds + elapsedTimeInSeconds >= damageTime;

  animation.timeInSeconds = animation.timeInSeconds + elapsedTimeInSeconds;

  if (animation.timeInSeconds >= scaledStabClipDuration) {
    animation.kind = SoldierAnimationKind.Idle;
    animation.timeInSeconds = animation.timeInSeconds - scaledStabClipDuration;
  }

  return dealsDamageThisTick;
}

/** Returns whether the animation crosses the damage point during this tick. */
function continueIdleThenStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  assets: Assets
): boolean {
  animation.timeInSeconds += elapsedTimeInSeconds;
  if (animation.timeInSeconds >= STAB_COOLDOWN) {
    animation.kind = SoldierAnimationKind.Stab;
    animation.timeInSeconds = animation.timeInSeconds - STAB_COOLDOWN;

    const timeScale = 1;
    const scaledStabClipDuration =
      assets.azukiSpearStabClip.duration / timeScale;
    return (
      animation.timeInSeconds >=
      scaledStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR
    );
  }

  return false;
}

function tickKings(elapsedTimeInSeconds: number, resources: Resources): void {
  const azukiKing = resources.battle.getAzukiKing();
  const edamameKing = resources.battle.getEdamameKing();
  const { keys, mouse } = resources;

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
        { yaw: azukiKing.yRot, pitch: 0, roll: 0 }
      );
      resources.battle.data.soldierExplosions.push(azukiExplosion);
      // resources.scene.remove(resources.azukiKing.gltf.scene);
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
        { yaw: edamameKing.yRot, pitch: 0, roll: 0 }
      );
      resources.battle.data.soldierExplosions.push(edamameExplosion);
      // resources.scene.remove(resources.edamameKing.gltf.scene);
    }
  }

  if (keys.t) {
    azukiKing.dragonfly.speed += 10 * elapsedTimeInSeconds;
  }
  if (keys.g) {
    azukiKing.dragonfly.speed = Math.max(
      DRAGONFLY_MIN_SPEED,
      azukiKing.dragonfly.speed - 10 * elapsedTimeInSeconds
    );
  }
  if (
    keys.r &&
    geoUtils.distanceToSquared(
      azukiKing.position,
      azukiKing.dragonfly.position
    ) <= DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED &&
    mouse.isLocked
  ) {
    mouse.x = 0.5;
    mouse.y = 0.5;
    azukiKing.dragonfly.isBeingRidden = true;
    azukiKing.dragonfly.isLanding = false;
    azukiKing.dragonfly.speed = DRAGONFLY_MIN_SPEED;
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
    // for (const soldier of plannedDeployment.setUnit.soldiers) {
    //   scene.remove(soldier.gltf.scene);
    // }

    const pendingUnit: Unit = {
      order: { kind: UnitOrderKind.Assemble },
      soldierIds: [],
      forward: plannedDeployment.plannedUnit.forward,
      isPreview: false,
      allegiance: plannedDeployment.plannedUnit.allegiance,
      areSoldiersStillBeingAdded: true,
    };
    const assemblingUnitId = battle.addEntity(pendingUnit);
    selectedTower.pendingUnits.push({
      unitId: assemblingUnitId,
      soldiers: plannedDeployment.plannedUnit.soldiers,
    });
    plannedDeployment.plannedUnit = null;
  }
}

function updateThreeJsProperties(soldier: Soldier | King): void {
  if (soldier.animation.kind === SoldierAnimationKind.Walk) {
    soldier.walkAction.play();

    soldier.stabAction.stop();
    if (isKing(soldier)) {
      soldier.slashAction.stop();
    }

    soldier.mixer.setTime(soldier.animation.timeInSeconds);
  } else if (soldier.animation.kind === SoldierAnimationKind.Stab) {
    soldier.stabAction.play();

    soldier.walkAction.stop();
    if (isKing(soldier)) {
      soldier.slashAction.stop();
    }

    soldier.mixer.setTime(soldier.animation.timeInSeconds);
  } else if (soldier.animation.kind === SoldierAnimationKind.Slash) {
    if (isKing(soldier)) {
      soldier.slashAction.play();
    }

    soldier.walkAction.stop();
    soldier.stabAction.stop();

    soldier.mixer.setTime(soldier.animation.timeInSeconds);
  } else {
    soldier.walkAction.stop();
    soldier.stabAction.stop();
    if (isKing(soldier)) {
      soldier.slashAction.stop();
    }
  }

  if (!isKing(soldier)) {
    soldier.gltf.scene.quaternion.setFromAxisAngle(
      new Vector3(0, 1, 0),
      soldier.yRot
    );
  }
}

function tickUnits(elapsedTimeInSeconds: number, resources: Resources): void {
  const { scene, soldierExplosions, units } = resources;
  for (const unit of units) {
    const { soldiers } = unit;
    for (let i = 0; i < soldiers.length; ++i) {
      const soldier = soldiers[i];
      if (soldier.health <= 0) {
        scene.remove(soldier.gltf.scene);
        const explosion = getSoldierExplosion(
          unit.allegiance,
          soldier.gltf.scene
        );
        soldierExplosions.push(explosion);
        soldiers.splice(i, 1);
        --i;
        continue;
      }
    }
  }

  for (const unit of units) {
    tickUnit(elapsedTimeInSeconds, unit, resources);
  }
}

function tickUnit(
  elapsedTimeInSeconds: number,
  unit: Unit,
  resources: Resources
): void {
  switch (unit.order.kind) {
    case UnitOrderKind.Advance:
      tickUnitWithAdvanceOrder(
        elapsedTimeInSeconds,
        unit,
        unit.order,
        resources
      );
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
  const { assets } = resources;

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
        SPEAR_ATTACK_RANGE_SQUARED,
        resources
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
          SPEAR_ATTACK_RANGE_SQUARED,
          resources
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
          const dealsDamageThisTick = continueStabThenIdleAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            soldier.stabAction.timeScale,
            assets
          );
          if (dealsDamageThisTick) {
            soldier.attackTarget.health -= STAB_DAMAGE;
          }
        } else if (soldier.animation.kind === SoldierAnimationKind.Idle) {
          const dealsDamageThisTick = continueIdleThenStabAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets
          );
          if (dealsDamageThisTick) {
            soldier.attackTarget.health -= STAB_DAMAGE;
          }
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
  let isUnitStillAssembling = false;

  for (const soldier of unit.soldiers) {
    let isReadyForCombat = false;

    const difference = soldier.assemblyPoint
      .clone()
      .sub(soldier.gltf.scene.position);
    if (difference.lengthSq() < 0.1) {
      const desiredYRot = Math.atan2(unit.forward.x, unit.forward.z);
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.yRot = limitTurn(soldier.yRot, desiredYRot, radiansPerTick);
      stopWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        1,
        resources.assets
      );

      if (
        soldier.animation.kind === SoldierAnimationKind.Idle &&
        soldier.yRot === desiredYRot
      ) {
        isReadyForCombat = true;
      }
    } else {
      const desiredYRot = Math.atan2(difference.x, difference.z) + Math.PI;
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.yRot = limitTurn(soldier.yRot, desiredYRot, radiansPerTick);
      startOrContinueWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        1,
        resources.assets
      );
      soldier.gltf.scene.translateZ(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * -1.5 * elapsedTimeInSeconds
      );
    }

    if (soldier.health > 0 && !isReadyForCombat) {
      isUnitStillAssembling = true;
    }
  }

  if (!unit.areSoldiersStillBeingAdded && !isUnitStillAssembling) {
    unit.order = { kind: UnitOrderKind.Advance };
  }
}

function getNearestEnemy(
  soldier: Soldier,
  soldierUnit: Unit,
  rangeSquared: number,
  { units, azukiKing, edamameKing }: Resources
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

  if (soldierUnit.allegiance !== Allegiance.Azuki) {
    const distSq = soldier.gltf.scene.position.distanceToSquared(
      azukiKing.gltf.scene.position
    );
    if (distSq < nearestDistanceSquared && azukiKing.health > 0) {
      nearestEnemy = azukiKing;
      nearestDistanceSquared = distSq;
    }
  }

  if (soldierUnit.allegiance !== Allegiance.Edamame) {
    const distSq = soldier.gltf.scene.position.distanceToSquared(
      edamameKing.gltf.scene.position
    );
    if (distSq < nearestDistanceSquared && edamameKing.health > 0) {
      nearestEnemy = edamameKing;
      nearestDistanceSquared = distSq;
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
  resources: Resources
): void {
  for (const tower of resources.towers) {
    tickBannerTower(elapsedTimeInSeconds, tower, resources);
  }
}

function tickBannerTower(
  elapsedTimeInSeconds: number,
  tower: BannerTower,
  { assets, scene, units, towers }: Resources
): void {
  if (tower.isPreview) {
    return;
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
      if (inTowerTerritory(soldier.gltf.scene.position, tower.position)) {
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
    scene.remove(getActiveBannerTowerGltf(tower).scene);
    tower.allegiance = uniqueOccupier;
    scene.add(getActiveBannerTowerGltf(tower).scene);
  }

  tower.secondsUntilNextSoldier -= elapsedTimeInSeconds;
  if (tower.secondsUntilNextSoldier <= 0 && tower.pendingSoldiers.length > 0) {
    const [soldier, unit, { isLastInUnit }] = tower.pendingSoldiers.shift()!;
    soldier.gltf.scene.position.copy(tower.position);
    unit.soldiers.push(soldier);
    scene.add(soldier.gltf.scene);
    if (isLastInUnit) {
      unit.areSoldiersStillBeingAdded = false;
    }
    tower.secondsUntilNextSoldier = SOLDIER_DEPLOYMENT_DELAY_SECONDS;
  }
}

function tickSoldierExplosions(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { soldierExplosions } = resources;
  for (let i = 0; i < soldierExplosions.length; ++i) {
    const explosion = soldierExplosions[i];
    explosion.timeInSeconds += elapsedTimeInSeconds;

    if (explosion.timeInSeconds > SOLDIER_EXPLOSION_DURATION) {
      if (explosion.scene !== null) {
        resources.scene.remove(explosion.scene);
      }
      soldierExplosions.splice(i, 1);
      continue;
    }

    const zeroIndexedFrameNumber = Math.min(
      Math.floor(
        (explosion.timeInSeconds / SOLDIER_EXPLOSION_DURATION) *
          SOLDIER_EXPLOSION_FRAME_COUNT
      ),
      SOLDIER_EXPLOSION_FRAME_COUNT - 1
    );

    if (explosion.scene !== null) {
      resources.scene.remove(explosion.scene);
    }

    const explosionFrames =
      explosion.allegiance === Allegiance.Azuki
        ? resources.assets.explodingAzukiFrames
        : resources.assets.explodingEdamameFrames;
    explosion.scene = explosionFrames[zeroIndexedFrameNumber].clone(true);
    explosion.scene.position.copy(explosion.position);
    explosion.scene.quaternion.copy(explosion.quaternion);
    resources.scene.add(explosion.scene);
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
  const { yRot, position } = king;
  const slashRangeSquared = 6 ** 2;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === allegiance) {
      continue;
    }

    for (const soldierId of unit.soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      const differenceSquared = new TripleManager(
        soldier.position
      ).distanceToSquared(position);
      const angleDifference = normalizeAngleBetweenNegPiAndPosPi(
        yRot -
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

function isKing(soldier: Soldier): soldier is King {
  return !!(soldier as King).isKing;
}

function getSoldierExplosion(
  allegiance: Allegiance,
  position: Triple,
  orientation: Orientation
): SoldierExplosion {
  const quaternion = new Quaternion();
  TripleManager.setQuaternionFromOrientation(quaternion, orientation);
  return {
    allegiance,
    position: new Vector3(position[0], position[1], position[2]),
    quaternion,
    timeInSeconds: 0,
    scene: null,
  };
}

function fromThreeVector(groundCursor: Vector3): Triple | null {
  throw new Error("Function not implemented.");
}
function getAzukiBannerTowerEnclosingGroundCursor(
  resources: Resources
): null | Ref {
  const { groundCursor } = resources;
  if (groundCursor === null) {
    return null;
  }

  for (const towerId of resources.battle.data.activeTowerIds) {
    const tower = resources.battle.getBannerTower(towerId);
    if (
      tower.allegiance === Allegiance.Azuki &&
      inTowerTerritory(groundCursor, tower.position)
    ) {
      return towerId;
    }
  }

  return null;
}
