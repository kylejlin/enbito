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
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import Perlin from "perlin.js";

export function main(assets: Assets): void {
  const mousePos = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mousePos.x = e.clientX / window.innerWidth;
    mousePos.y = e.clientY / window.innerHeight;
  });

  const keys = {
    w: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
  });

  let lastTime = Date.now();

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    114,
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

  const player = assets.azuki.scene;
  player.position.set(0, 0, 0);
  const playerWalkClip = AnimationClip.findByName(
    assets.azuki.animations,
    "Walk"
  );

  const playerMixer = new AnimationMixer(player);
  const playerWalkAction = playerMixer.clipAction(playerWalkClip);
  playerWalkAction.play();

  addSky();
  addEnvironment();
  scene.add(player);

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
      player.translateZ((3 * -elapsedTime) / 1000);
    } else {
      playerWalkAction.stop();
    }

    playerMixer.update((2 * elapsedTime) / 1000);

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

  Perlin.seed(123);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < 1000; ++i) {
    const y = Perlin.simplex2(i, 0);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  console.log({ min, max });
}
