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
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

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
  explodingAzukiSpearFrames: [
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group,
    Group
  ];
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
    Promise.all([
      getAzukiSpearExplodingFrame("000001"),
      getAzukiSpearExplodingFrame("000002"),
      getAzukiSpearExplodingFrame("000003"),
      getAzukiSpearExplodingFrame("000004"),
      getAzukiSpearExplodingFrame("000005"),
      getAzukiSpearExplodingFrame("000006"),
      getAzukiSpearExplodingFrame("000007"),
      getAzukiSpearExplodingFrame("000008"),
      getAzukiSpearExplodingFrame("000009"),
      getAzukiSpearExplodingFrame("000010"),
      getAzukiSpearExplodingFrame("000011"),
      getAzukiSpearExplodingFrame("000012"),
      getAzukiSpearExplodingFrame("000013"),
      getAzukiSpearExplodingFrame("000014"),
      getAzukiSpearExplodingFrame("000015"),
      getAzukiSpearExplodingFrame("000016"),
      getAzukiSpearExplodingFrame("000017"),
      getAzukiSpearExplodingFrame("000018"),
      getAzukiSpearExplodingFrame("000019"),
      getAzukiSpearExplodingFrame("000020"),
      getAzukiSpearExplodingFrame("000021"),
      getAzukiSpearExplodingFrame("000022"),
      getAzukiSpearExplodingFrame("000023"),
      getAzukiSpearExplodingFrame("000024"),
      getAzukiSpearExplodingFrame("000025"),
      getAzukiSpearExplodingFrame("000026"),
      getAzukiSpearExplodingFrame("000027"),
      getAzukiSpearExplodingFrame("000028"),
      getAzukiSpearExplodingFrame("000029"),
    ]),
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
      explodingAzukiSpearFrames,
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
        explodingAzukiSpearFrames,
      };
    }
  );
}

function getAzukiSpearExplodingFrame(id: string): Promise<Group> {
  return new Promise<Group>((resolve) => {
    new MTLLoader().load(
      `./models/azuki_spear_exploding_frames/azuki_spear_exploding_${id}.mtl`,
      (mtl) => {
        new OBJLoader()
          .setMaterials(mtl)
          .load(
            `./models/azuki_spear_exploding_frames/azuki_spear_exploding_${id}.obj`,
            resolve
          );
      }
    );
  });
}
