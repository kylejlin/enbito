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
  Object3D,
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import { cloneGltf } from "./cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Allegiance, BattleStateData } from "./battleStateData";

export class San {
  constructor(public readonly data: SanData) {}
}

export interface SanData {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;

  sky: Sky;

  azukiKing: SanKing;
  edamameKing: SanKing;
  azukiSpears: SanSpear[];
  edamameSpears: SanSpear[];
  azukiBannerTowers: BannerTower[];
  edamameBannerTowers: BannerTower[];
}

export interface SanSpear {
  gltf: GLTF;
  mixer: AnimationMixer;
  walkClip: AnimationClip;
  walkAction: AnimationAction;
  stabClip: AnimationClip;
  stabAction: AnimationAction;
}

export interface SanKing {
  gltf: GLTF;
  mixer: AnimationMixer;
  walkClip: AnimationClip;
  walkAction: AnimationAction;
  slashClip: AnimationClip;
  slashAction: AnimationAction;
}

export interface SansDragonfly {
  gltf: GLTF;
  mixer: AnimationMixer;
  flyClip: AnimationClip;
  flyAction: AnimationAction;
}

export interface BannerTower {
  gltf: GLTF;
}

export interface SoldierExplosion {
  scene: null | Object3D;
}

export function getDefaultSanData(assets: Assets): SanData {
  const renderer = new WebGLRenderer();
  renderer.useLegacyLights = false;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  const scene = new Scene();

  const camera = new PerspectiveCamera(
    57,
    window.innerWidth / window.innerHeight,
    undefined,
    10000
  );

  return {
    camera,
    scene,
    renderer,

    sky: getDefaultSky(renderer, scene, camera),

    azukiKing: getDefaultSanKing(assets, Allegiance.Azuki),
    edamameKing: getDefaultSanKing(assets, Allegiance.Edamame),
    azukiSpears: [],
    edamameSpears: [],
    azukiBannerTowers: [],
    edamameBannerTowers: [],
  };
}

export function getDefaultSanKing(
  assets: Assets,
  allegiance: Allegiance
): SanKing {
  const gltf =
    allegiance === Allegiance.Azuki
      ? cloneGltf(assets.azukiKing)
      : cloneGltf(assets.edamameKing);
  const playerScene = gltf.scene;
  const walkClip = AnimationClip.findByName(gltf.animations, "Walk");
  const slashClip = AnimationClip.findByName(gltf.animations, "Slash");

  const mixer = new AnimationMixer(playerScene);
  const walkAction = mixer.clipAction(walkClip);
  const slashAction = mixer.clipAction(slashClip);
  walkAction.timeScale = 2;

  return {
    gltf,
    mixer,
    walkClip,
    walkAction,
    slashAction,
    slashClip,
  };
}

export function getDefaultSky(
  renderer: SanData["renderer"],
  scene: SanData["scene"],
  camera: SanData["camera"]
): Sky {
  // Based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_sky.html
  const sky = new Sky();
  sky.scale.setScalar(450000);

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

  return sky;
}
