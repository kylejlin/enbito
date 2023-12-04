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
  mcon: ModelConstants;
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
  edamameKing: GLTF;
  explodingAzukiFrames: [
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
  explodingEdamameFrames: [
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

export interface ModelConstants {
  azukiSpearWalkClipDuration: number;
  azukiKingSlashClipDuration: number;
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
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/edamame_king.glb", (gltf) => {
        resolve(gltf);
      });
    }),
    Promise.all([
      getAzukiExplodingFrame("000001"),
      getAzukiExplodingFrame("000002"),
      getAzukiExplodingFrame("000003"),
      getAzukiExplodingFrame("000004"),
      getAzukiExplodingFrame("000005"),
      getAzukiExplodingFrame("000006"),
      getAzukiExplodingFrame("000007"),
      getAzukiExplodingFrame("000008"),
      getAzukiExplodingFrame("000009"),
      getAzukiExplodingFrame("000010"),
      getAzukiExplodingFrame("000011"),
      getAzukiExplodingFrame("000012"),
      getAzukiExplodingFrame("000013"),
      getAzukiExplodingFrame("000014"),
      getAzukiExplodingFrame("000015"),
      getAzukiExplodingFrame("000016"),
      getAzukiExplodingFrame("000017"),
      getAzukiExplodingFrame("000018"),
      getAzukiExplodingFrame("000019"),
      getAzukiExplodingFrame("000020"),
      getAzukiExplodingFrame("000021"),
      getAzukiExplodingFrame("000022"),
      getAzukiExplodingFrame("000023"),
      getAzukiExplodingFrame("000024"),
      getAzukiExplodingFrame("000025"),
      getAzukiExplodingFrame("000026"),
      getAzukiExplodingFrame("000027"),
      getAzukiExplodingFrame("000028"),
      getAzukiExplodingFrame("000029"),
    ]),
    Promise.all([
      getEdamameExplodingFrame("000001"),
      getEdamameExplodingFrame("000002"),
      getEdamameExplodingFrame("000003"),
      getEdamameExplodingFrame("000004"),
      getEdamameExplodingFrame("000005"),
      getEdamameExplodingFrame("000006"),
      getEdamameExplodingFrame("000007"),
      getEdamameExplodingFrame("000008"),
      getEdamameExplodingFrame("000009"),
      getEdamameExplodingFrame("000010"),
      getEdamameExplodingFrame("000011"),
      getEdamameExplodingFrame("000012"),
      getEdamameExplodingFrame("000013"),
      getEdamameExplodingFrame("000014"),
      getEdamameExplodingFrame("000015"),
      getEdamameExplodingFrame("000016"),
      getEdamameExplodingFrame("000017"),
      getEdamameExplodingFrame("000018"),
      getEdamameExplodingFrame("000019"),
      getEdamameExplodingFrame("000020"),
      getEdamameExplodingFrame("000021"),
      getEdamameExplodingFrame("000022"),
      getEdamameExplodingFrame("000023"),
      getEdamameExplodingFrame("000024"),
      getEdamameExplodingFrame("000025"),
      getEdamameExplodingFrame("000026"),
      getEdamameExplodingFrame("000027"),
      getEdamameExplodingFrame("000028"),
      getEdamameExplodingFrame("000029"),
    ]),
    new Promise<GLTF>((resolve) => {
      new GLTFLoader().load("./models/azuki_spear_baked.glb", (gltf) => {
        resolve(gltf);
      });
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
      edamameKing,
      explodingAzukiFrames,
      explodingEdamameFrames,
      azukiSpearBaked,
    ]): Assets => {
      console.log({ azukiSpearBaked });
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

      const mcon: ModelConstants = {
        azukiSpearWalkClipDuration: azukiSpearWalkClip.duration,
        azukiKingSlashClipDuration: azukiKingSlashClip.duration,
      };

      return {
        mcon,
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
        edamameKing,
        explodingAzukiFrames,
        explodingEdamameFrames,
      };
    }
  );
}

function getAzukiExplodingFrame(id: string): Promise<Group> {
  return new Promise<Group>((resolve) => {
    new MTLLoader().load(
      `./models/soldier_unarmed_exploding_frames/azuki_unarmed_common.mtl`,
      (mtl) => {
        new OBJLoader()
          .setMaterials(mtl)
          .load(
            `./models/soldier_unarmed_exploding_frames/azuki_unarmed_exploding_${id}.obj`,
            resolve
          );
      }
    );
  });
}

function getEdamameExplodingFrame(id: string): Promise<Group> {
  return new Promise<Group>((resolve) => {
    new MTLLoader().load(
      `./models/soldier_unarmed_exploding_frames/edamame_unarmed_common.mtl`,
      (mtl) => {
        new OBJLoader().setMaterials(mtl).load(
          // This is not a typo.
          // We use the same mesh for both azuki and edamame soldier explosions.
          `./models/soldier_unarmed_exploding_frames/azuki_unarmed_exploding_${id}.obj`,
          resolve
        );
      }
    );
  });
}
