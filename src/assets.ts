import {
  AnimationClip,
  DataTexture,
  EquirectangularReflectionMapping,
  LoadingManager,
  Texture,
  TextureLoader,
  Group,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

export interface Assets {
  environment: DataTexture;
  azukiSpear: GLTF;
  azukiSpearWalkClip: AnimationClip;
  azukiSpearStabClip: AnimationClip;
  azukiKingSlashClip: AnimationClip;
  edamameSpear: GLTF;
  edamameSpearWalkClip: AnimationClip;
  edamameSpearStabClip: AnimationClip;
  dragonfly: GLTF;
  grass: Texture;
  azukiBannerTower: GLTF;
  edamameBannerTower: GLTF;
  azukiKing: GLTF;
  explodingAzukiSpear1: Group;
}

export function loadAssets(): Promise<Assets> {
  return Promise.all([
    new Promise<DataTexture>((resolve) => {
      new RGBELoader()
        .setPath("")
        .load("venice_sunset_4k.hdr", function (texture) {
          texture.mapping = EquirectangularReflectionMapping;
          resolve(texture);
        });
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/azuki_spear.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/edamame_spear.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/dragonfly.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<Texture>((resolve) => {
      const manager = new LoadingManager();
      manager.onLoad = onLoad;
      const textureLoader = new TextureLoader(manager);
      const texture = textureLoader.load("grass_texture.png");

      function onLoad(): void {
        resolve(texture);
      }
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/azuki_banner_tower.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/edamame_banner_tower.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/azuki_king.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    new Promise<Group>((resolve) => {
      new OBJLoader().load(
        "./models/azuki_spear_exploding_frames/azuki_spear_exploding_000001.obj",
        (obj) => {
          console.log({ obj });
          resolve(obj);
        }
      );
    }),
  ]).then(
    ([
      environment,
      azukiSpear,
      edamameSpear,
      dragonfly,
      grass,
      azukiBannerTower,
      edamameBannerTower,
      azukiKing,
      explodingAzukiSpear1,
    ]): Assets => {
      const azukiSpearWalkClip = AnimationClip.findByName(
        azukiSpear.animations,
        "Walk"
      );
      const azukiSpearStabClip = AnimationClip.findByName(
        azukiSpear.animations,
        "Stab"
      );
      const edamameSpearWalkClip = AnimationClip.findByName(
        edamameSpear.animations,
        "Walk"
      );
      const edamameSpearStabClip = AnimationClip.findByName(
        edamameSpear.animations,
        "Stab"
      );
      const azukiKingSlashClip = AnimationClip.findByName(
        azukiKing.animations,
        "Slash"
      );
      return {
        environment,
        azukiSpear,
        azukiSpearWalkClip,
        azukiSpearStabClip,
        azukiKingSlashClip,
        edamameSpear,
        edamameSpearWalkClip,
        edamameSpearStabClip,
        dragonfly,
        grass,
        azukiBannerTower,
        edamameBannerTower,
        azukiKing,
        explodingAzukiSpear1,
      };
    }
  );
}
