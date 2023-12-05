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
  InstancedMesh,
  SkinnedMesh,
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import { cloneGltf } from "./cloneGltf";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Allegiance, BattleStateData } from "./battleStateData";
import { Tuple29 } from "./tuple29";

export const MAX_SOLDIER_LIMIT = 10e3;

export class San {
  constructor(public readonly data: SanData) {}
}

export interface SanData {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;

  sky: Sky;
  grass: Mesh;

  azukiKing: SanKing;
  edamameKing: SanKing;
  azukiSpearWalkFrames: Tuple29<InstancedMesh>;
  azukiSpearStabFrames: Tuple29<InstancedMesh>;
  edamameSpearWalkFrames: Tuple29<InstancedMesh>;
  edamameSpearStabFrames: Tuple29<InstancedMesh>;
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
    grass: getDefaultGrass(assets),

    azukiKing: getDefaultSanKing(assets, Allegiance.Azuki),
    edamameKing: getDefaultSanKing(assets, Allegiance.Edamame),
    azukiSpearWalkFrames: getDefaultSanAzukiSpearWalkFrames(assets),
    azukiSpearStabFrames: getDefaultSanAzukiSpearStabFrames(assets),
    edamameSpearWalkFrames: getDefaultSanEdamameSpearWalkFrames(assets),
    edamameSpearStabFrames: getDefaultSanEdamameSpearStabFrames(assets),
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

export function getDefaultGrass(assets: Assets): Mesh {
  const texture = assets.grass.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const grasslikeSize = 100000;
  texture.repeat.set(grasslikeSize, grasslikeSize);
  const grass = new Mesh(
    new PlaneGeometry(grasslikeSize, grasslikeSize),
    new MeshBasicMaterial({ map: texture })
  );
  grass.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  grass.position.set(-1, 0, -1);
  return grass;
}

export function getDefaultSanAzukiSpearWalkFrames(
  assets: Assets
): Tuple29<InstancedMesh> {
  return assets.azukiSpearWalkFrames.map((frame: GLTF): InstancedMesh => {
    const source = frame.scene.children[0].children[0] as SkinnedMesh;
    return new InstancedMesh(
      source.geometry,
      source.material,
      MAX_SOLDIER_LIMIT
    );
  }) as Tuple29<InstancedMesh>;
}

export function getDefaultSanAzukiSpearStabFrames(
  assets: Assets
): Tuple29<InstancedMesh> {
  return assets.azukiSpearStabFrames.map((frame: GLTF): InstancedMesh => {
    const source = frame.scene.children[0].children[0] as SkinnedMesh;
    return new InstancedMesh(
      source.geometry,
      source.material,
      MAX_SOLDIER_LIMIT
    );
  }) as Tuple29<InstancedMesh>;
}

export function getDefaultSanEdamameSpearWalkFrames(
  assets: Assets
): Tuple29<InstancedMesh> {
  return assets.edamameSpearWalkFrames.map((frame: GLTF): InstancedMesh => {
    const source = frame.scene.children[0].children[0] as SkinnedMesh;
    return new InstancedMesh(
      source.geometry,
      source.material,
      MAX_SOLDIER_LIMIT
    );
  }) as Tuple29<InstancedMesh>;
}

export function getDefaultSanEdamameSpearStabFrames(
  assets: Assets
): Tuple29<InstancedMesh> {
  return assets.edamameSpearStabFrames.map((frame: GLTF): InstancedMesh => {
    const source = frame.scene.children[0].children[0] as SkinnedMesh;
    return new InstancedMesh(
      source.geometry,
      source.material,
      MAX_SOLDIER_LIMIT
    );
  }) as Tuple29<InstancedMesh>;
}
