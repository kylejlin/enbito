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

  return {
    camera: new PerspectiveCamera(
      57,
      window.innerWidth / window.innerHeight,
      undefined,
      10000
    ),
    scene: new Scene(),
    renderer,

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
