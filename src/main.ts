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
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { getWindLayer } from "./scene/windLayer";
import { getGrass } from "./scene/grass";
import { RepeatWrapping } from "three";

export function main(assets: Assets): void {
  const mousePos = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mousePos.x = e.clientX / window.innerWidth;
    mousePos.y = e.clientY / window.innerHeight;
  });

  let lastTime = Date.now();
  let turnAngle = 0;

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

  const grassShape = new Mesh(
    new PlaneGeometry(),
    new MeshBasicMaterial({ color: 0x221600 })
  );

  const windLayer = getWindLayer();

  const grassPrototype = getGrass(grassShape, windLayer);

  for (let i = 0; i < 10; ++i) {
    const grass = grassPrototype.clone();
    grass.position.set(i, 0, 0);
    grass.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
    scene.add(grass);
  }

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

  // End variable declarations.

  const shovelPlane = assets.shovelPlane.scene.clone(true);
  shovelPlane.position.set(0, 5, 0);

  addSky();
  addEnvironment();
  scene.add(shovelPlane);

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
    // (windLayer as any).time += (elapsedTime * 0.005) / 10;
    cubeCamera.update(renderer, scene);
    render();

    shovelPlane.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    shovelPlane.rotateY(turnAngle);
    shovelPlane.rotateX((mousePos.y - 0.5) * Math.PI * 2);
    shovelPlane.rotateZ((mousePos.x - 0.5) * Math.PI * 2);
    turnAngle += -0.05 * ((mousePos.x - 0.5) * Math.PI * 2);

    shovelPlane.translateZ(0.01 * elapsedTime);

    camera.position.copy(shovelPlane.position);
    camera.quaternion.copy(shovelPlane.quaternion);
    camera.rotateY(Math.PI);
    camera.translateY(1);
    camera.translateZ(2);

    requestAnimationFrame(tick);
  }

  function addEnvironment(): void {
    scene.environment = assets.environment;
  }
}
