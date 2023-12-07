import {
  AnimationClip,
  DataTexture,
  EquirectangularReflectionMapping,
  LoadingManager,
  Texture,
  TextureLoader,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
  azukiUnarmedExplosionFrames: Tuple29<GLTF>;
  edamameUnarmedExplosionFrames: Tuple29<GLTF>;
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
      getAzukiExplodingFrame("f0001"),
      getAzukiExplodingFrame("f0002"),
      getAzukiExplodingFrame("f0003"),
      getAzukiExplodingFrame("f0004"),
      getAzukiExplodingFrame("f0005"),
      getAzukiExplodingFrame("f0006"),
      getAzukiExplodingFrame("f0007"),
      getAzukiExplodingFrame("f0008"),
      getAzukiExplodingFrame("f0009"),
      getAzukiExplodingFrame("f0010"),
      getAzukiExplodingFrame("f0011"),
      getAzukiExplodingFrame("f0012"),
      getAzukiExplodingFrame("f0013"),
      getAzukiExplodingFrame("f0014"),
      getAzukiExplodingFrame("f0015"),
      getAzukiExplodingFrame("f0016"),
      getAzukiExplodingFrame("f0017"),
      getAzukiExplodingFrame("f0018"),
      getAzukiExplodingFrame("f0019"),
      getAzukiExplodingFrame("f0020"),
      getAzukiExplodingFrame("f0021"),
      getAzukiExplodingFrame("f0022"),
      getAzukiExplodingFrame("f0023"),
      getAzukiExplodingFrame("f0024"),
      getAzukiExplodingFrame("f0025"),
      getAzukiExplodingFrame("f0026"),
      getAzukiExplodingFrame("f0027"),
      getAzukiExplodingFrame("f0028"),
      getAzukiExplodingFrame("f0029"),
    ]),
    Promise.all([
      getEdamameExplodingFrame("f0001"),
      getEdamameExplodingFrame("f0002"),
      getEdamameExplodingFrame("f0003"),
      getEdamameExplodingFrame("f0004"),
      getEdamameExplodingFrame("f0005"),
      getEdamameExplodingFrame("f0006"),
      getEdamameExplodingFrame("f0007"),
      getEdamameExplodingFrame("f0008"),
      getEdamameExplodingFrame("f0009"),
      getEdamameExplodingFrame("f0010"),
      getEdamameExplodingFrame("f0011"),
      getEdamameExplodingFrame("f0012"),
      getEdamameExplodingFrame("f0013"),
      getEdamameExplodingFrame("f0014"),
      getEdamameExplodingFrame("f0015"),
      getEdamameExplodingFrame("f0016"),
      getEdamameExplodingFrame("f0017"),
      getEdamameExplodingFrame("f0018"),
      getEdamameExplodingFrame("f0019"),
      getEdamameExplodingFrame("f0020"),
      getEdamameExplodingFrame("f0021"),
      getEdamameExplodingFrame("f0022"),
      getEdamameExplodingFrame("f0023"),
      getEdamameExplodingFrame("f0024"),
      getEdamameExplodingFrame("f0025"),
      getEdamameExplodingFrame("f0026"),
      getEdamameExplodingFrame("f0027"),
      getEdamameExplodingFrame("f0028"),
      getEdamameExplodingFrame("f0029"),
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
      azukiUnarmedExplosionFrames,
      edamameUnarmedExplosionFrames,
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
        azukiUnarmedExplosionFrames,
        edamameUnarmedExplosionFrames,
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

function getAzukiExplodingFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/azuki_unarmed_frames/explode/explode.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
}

function getEdamameExplodingFrame(id: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve) => {
    new GLTFLoader().load(
      `./models/edamame_unarmed_frames/explode/explode.${id}.glb`,
      (gltf) => {
        resolve(gltf);
      }
    );
  });
}
