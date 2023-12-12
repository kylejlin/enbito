import { InstancedMesh, Scene } from "three";
import { GltfCache, San } from "../san";

export function addInstancedMeshesToSceneAndFlagForUpdate(san: San): void {
  const {
    scene,

    azukiSpearWalkFrames,
    azukiSpearStabFrames,
    edamameSpearWalkFrames,
    edamameSpearStabFrames,

    azukiUnarmedExplosionFrames,
    edamameUnarmedExplosionFrames,

    azukiBannerTowers,
    edamameBannerTowers,

    dragonflies,
  } = san.data;

  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiSpearWalkFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiSpearStabFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameSpearWalkFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameSpearStabFrames,
    scene
  );

  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    azukiUnarmedExplosionFrames,
    scene
  );
  addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
    edamameUnarmedExplosionFrames,
    scene
  );

  addGltfCacheToScene(azukiBannerTowers, scene);
  addGltfCacheToScene(edamameBannerTowers, scene);

  addGltfCacheToScene(dragonflies, scene);
}

function addNonEmptyInstancedMeshesToSceneAndFlagForUpdate(
  meshes: InstancedMesh[],
  scene: Scene
): void {
  for (const mesh of meshes) {
    if (mesh.count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
  }
}

function addGltfCacheToScene(meshCache: GltfCache, scene: Scene): void {
  const { gltfs, count } = meshCache;
  for (let i = 0; i < count; ++i) {
    scene.add(gltfs[i].scene);
  }
}
