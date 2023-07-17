import {
  DataTexture,
  EquirectangularReflectionMapping,
  LoadingManager,
  Texture,
  TextureLoader,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface Assets {
  environment: DataTexture;
  shovelPlane: GLTF;
  grass: Texture;
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
      new GLTFLoader().load("./models/shovel.glb", (gltf) => {
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
  ]).then(([environment, shovelPlane, grass]): Assets => {
    return { environment, shovelPlane, grass };
  });
}
