import { Assets } from "./assets";
import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Quaternion,
  Vector3,
  BoxGeometry,
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
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import { cloneGltf } from "./cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export function main(assets: Assets): void {
  const mousePos = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mousePos.x = e.clientX / window.innerWidth;
    mousePos.y = e.clientY / window.innerHeight;
  });

  const keys = {
    w: false,
    space: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
    if (e.key === " ") {
      keys.space = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
    if (e.key === " ") {
      keys.space = false;
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

  const yMarker = new Mesh(
    new BoxGeometry(),
    new MeshBasicMaterial({ color: 0x0088bb })
  );
  yMarker.position.set(0, 5, 0);
  scene.add(yMarker);

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
  flyAction.play();

  scene.add(dragonfly);
  dragonfly.position.set(0, 5, 0);
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

  const rankGap = 8 * (Math.sqrt(3) / 2);
  const azukiSoldiers = [
    getAzukiSoldier(8 * 1, 0, 0, assets),
    getAzukiSoldier(8 * 2, 0, 0, assets),
    getAzukiSoldier(8 * 3, 0, 0, assets),
    getAzukiSoldier(8 * 4, 0, 0, assets),
    getAzukiSoldier(8 * 5, 0, 0, assets),
    getAzukiSoldier(8 * 6, 0, 0, assets),
    getAzukiSoldier(8 * 7, 0, 0, assets),
    getAzukiSoldier(8 * 8, 0, 0, assets),
    getAzukiSoldier(8 * 9, 0, 0, assets),
    getAzukiSoldier(8 * 10, 0, 0, assets),
    //
    getAzukiSoldier(8 * 1.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 2.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 3.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 4.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 5.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 6.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 7.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 8.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 9.5, 0, rankGap, assets),
    getAzukiSoldier(8 * 10.5, 0, rankGap, assets),

    getAzukiSoldier(8 * 1, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 2, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 3, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 4, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 5, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 6, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 7, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 8, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 9, 0, 2 * rankGap, assets),
    getAzukiSoldier(8 * 10, 0, 2 * rankGap, assets),
  ];

  for (const soldier of azukiSoldiers) {
    scene.add(soldier.gltf.scene);
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
    player.rotateY(-(mousePos.x - 0.5) * Math.PI * 2);

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

    enemyMixer.update((1 * elapsedTime) / 1000);
    enemy.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    enemy.rotateY(
      Math.atan2(
        player.position.x - enemy.position.x,
        player.position.z - enemy.position.z
      ) + Math.PI
    );

    for (const soldier of azukiSoldiers) {
      soldier.walkAction.play();
      soldier.stabAction.stop();
      soldier.mixer.update((1 * elapsedTime) / 1000);
      soldier.gltf.scene.translateZ((1.5 * -elapsedTime) / 1000);
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
    camera.rotateX(-(mousePos.y - 0.5) * Math.PI);

    requestAnimationFrame(tick);
  }

  function addEnvironment(): void {
    scene.environment = assets.environment;
  }
}

interface Soldier {
  gltf: GLTF;
  mixer: AnimationMixer;
  walkAction: AnimationAction;
  stabAction: AnimationAction;
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
