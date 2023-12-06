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
import { Tuple24, Tuple29 } from "./nTuple";

export const BLENDER_FPS = 24;

export interface Assets {
  mcon: ModelConstants;
  environment: DataTexture;

  // TODO: Delete this section
  // Section start
  azukiSpear: GLTF;
  azukiSpearWalkClip: AnimationClip;
  azukiSpearStabClip: AnimationClip;
  edamameSpear: GLTF;
  edamameSpearWalkClip: AnimationClip;
  edamameSpearStabClip: AnimationClip;
  // Section end

  azukiKingSlashClip: AnimationClip;
  dragonfly: GLTF;
  grass: Texture;
  azukiBannerTower: GLTF;
  edamameBannerTower: GLTF;
  azukiKing: GLTF;
  edamameKing: GLTF;
  azukiSpearWalkFrames: Tuple29<GLTF>;
  azukiSpearStabFrames: Tuple24<GLTF>;
  edamameSpearWalkFrames: Tuple29<GLTF>;
  edamameSpearStabFrames: Tuple24<GLTF>;
  // TODO Rename to `azukiExplodingFrames` to be more consistent.
  explodingAzukiFrames: Tuple29<Group>;
  explodingEdamameFrames: Tuple29<Group>;
}

export interface ModelConstants {
  azukiSpearWalkClipDuration: number;
  azukiSpearStabClipDuration: number;
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
      getAzukiSpearWalkFrame("f0001"),
      getAzukiSpearWalkFrame("f0002"),
      getAzukiSpearWalkFrame("f0003"),
      getAzukiSpearWalkFrame("f0004"),
      getAzukiSpearWalkFrame("f0005"),
      getAzukiSpearWalkFrame("f0006"),
      getAzukiSpearWalkFrame("f0007"),
      getAzukiSpearWalkFrame("f0008"),
      getAzukiSpearWalkFrame("f0009"),
      getAzukiSpearWalkFrame("f0010"),
      getAzukiSpearWalkFrame("f0011"),
      getAzukiSpearWalkFrame("f0012"),
      getAzukiSpearWalkFrame("f0013"),
      getAzukiSpearWalkFrame("f0014"),
      getAzukiSpearWalkFrame("f0015"),
      getAzukiSpearWalkFrame("f0016"),
      getAzukiSpearWalkFrame("f0017"),
      getAzukiSpearWalkFrame("f0018"),
      getAzukiSpearWalkFrame("f0019"),
      getAzukiSpearWalkFrame("f0020"),
      getAzukiSpearWalkFrame("f0021"),
      getAzukiSpearWalkFrame("f0022"),
      getAzukiSpearWalkFrame("f0023"),
      getAzukiSpearWalkFrame("f0024"),
      getAzukiSpearWalkFrame("f0025"),
      getAzukiSpearWalkFrame("f0026"),
      getAzukiSpearWalkFrame("f0027"),
      getAzukiSpearWalkFrame("f0028"),
      getAzukiSpearWalkFrame("f0029"),
    ]),
    Promise.all([
      getAzukiSpearWalkFrame("f0001"),
      getAzukiSpearStabFrame("f0002"),
      getAzukiSpearStabFrame("f0003"),
      getAzukiSpearStabFrame("f0004"),
      getAzukiSpearStabFrame("f0005"),
      getAzukiSpearStabFrame("f0006"),
      getAzukiSpearStabFrame("f0007"),
      getAzukiSpearStabFrame("f0008"),
      getAzukiSpearStabFrame("f0009"),
      getAzukiSpearStabFrame("f0010"),
      getAzukiSpearStabFrame("f0011"),
      getAzukiSpearStabFrame("f0012"),
      getAzukiSpearStabFrame("f0013"),
      getAzukiSpearStabFrame("f0014"),
      getAzukiSpearStabFrame("f0015"),
      getAzukiSpearStabFrame("f0016"),
      getAzukiSpearStabFrame("f0017"),
      getAzukiSpearStabFrame("f0018"),
      getAzukiSpearStabFrame("f0019"),
      getAzukiSpearStabFrame("f0020"),
      getAzukiSpearStabFrame("f0021"),
      getAzukiSpearStabFrame("f0022"),
      getAzukiSpearStabFrame("f0023"),
      getAzukiSpearStabFrame("f0024"),
    ]),
    Promise.all([
      getEdamameSpearWalkFrame("f0001"),
      getEdamameSpearWalkFrame("f0002"),
      getEdamameSpearWalkFrame("f0003"),
      getEdamameSpearWalkFrame("f0004"),
      getEdamameSpearWalkFrame("f0005"),
      getEdamameSpearWalkFrame("f0006"),
      getEdamameSpearWalkFrame("f0007"),
      getEdamameSpearWalkFrame("f0008"),
      getEdamameSpearWalkFrame("f0009"),
      getEdamameSpearWalkFrame("f0010"),
      getEdamameSpearWalkFrame("f0011"),
      getEdamameSpearWalkFrame("f0012"),
      getEdamameSpearWalkFrame("f0013"),
      getEdamameSpearWalkFrame("f0014"),
      getEdamameSpearWalkFrame("f0015"),
      getEdamameSpearWalkFrame("f0016"),
      getEdamameSpearWalkFrame("f0017"),
      getEdamameSpearWalkFrame("f0018"),
      getEdamameSpearWalkFrame("f0019"),
      getEdamameSpearWalkFrame("f0020"),
      getEdamameSpearWalkFrame("f0021"),
      getEdamameSpearWalkFrame("f0022"),
      getEdamameSpearWalkFrame("f0023"),
      getEdamameSpearWalkFrame("f0024"),
      getEdamameSpearWalkFrame("f0025"),
      getEdamameSpearWalkFrame("f0026"),
      getEdamameSpearWalkFrame("f0027"),
      getEdamameSpearWalkFrame("f0028"),
      getEdamameSpearWalkFrame("f0029"),
    ]),
    Promise.all([
      getEdamameSpearWalkFrame("f0001"),
      getEdamameSpearStabFrame("f0002"),
      getEdamameSpearStabFrame("f0003"),
      getEdamameSpearStabFrame("f0004"),
      getEdamameSpearStabFrame("f0005"),
      getEdamameSpearStabFrame("f0006"),
      getEdamameSpearStabFrame("f0007"),
      getEdamameSpearStabFrame("f0008"),
      getEdamameSpearStabFrame("f0009"),
      getEdamameSpearStabFrame("f0010"),
      getEdamameSpearStabFrame("f0011"),
      getEdamameSpearStabFrame("f0012"),
      getEdamameSpearStabFrame("f0013"),
      getEdamameSpearStabFrame("f0014"),
      getEdamameSpearStabFrame("f0015"),
      getEdamameSpearStabFrame("f0016"),
      getEdamameSpearStabFrame("f0017"),
      getEdamameSpearStabFrame("f0018"),
      getEdamameSpearStabFrame("f0019"),
      getEdamameSpearStabFrame("f0020"),
      getEdamameSpearStabFrame("f0021"),
      getEdamameSpearStabFrame("f0022"),
      getEdamameSpearStabFrame("f0023"),
      getEdamameSpearStabFrame("f0024"),
    ]),
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
      azukiSpearWalkFrames,
      azukiSpearStabFrames,
      edamameSpearWalkFrames,
      edamameSpearStabFrames,
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
        azukiSpearWalkClipDuration: azukiSpearWalkFrames.length / BLENDER_FPS,
        azukiSpearStabClipDuration: azukiSpearStabFrames.length / BLENDER_FPS,
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
        azukiSpearWalkFrames,
        azukiSpearStabFrames,
        edamameSpearWalkFrames,
        edamameSpearStabFrames,
        explodingAzukiFrames,
        explodingEdamameFrames,
      };
    }
  );
}

function getAzukiSpearWalkFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/azuki_spear_frames/walk/walk.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
}

function getAzukiSpearStabFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/azuki_spear_frames/stab/stab.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
}

function getEdamameSpearWalkFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/edamame_spear_frames/walk/walk.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
}

function getEdamameSpearStabFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/edamame_spear_frames/stab/stab.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
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
