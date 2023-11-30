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
import { BattleState } from "./battleState";

export interface San {
  scene: Scene;
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

export interface SanKing extends SanSpear {
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
