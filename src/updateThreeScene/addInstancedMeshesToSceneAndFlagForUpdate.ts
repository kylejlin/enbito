import { InstancedMesh, Scene } from "three";
import { San } from "../san";

export function addInstancedMeshesToSceneAndFlagForUpdate(san: San): void {
  const {
    scene,

    azukiSpearWalkFrames,
    azukiSpearStabFrames,
    edamameSpearWalkFrames,
    edamameSpearStabFrames,

    azukiUnarmedExplosionFrames,
    edamameUnarmedExplosionFrames,
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
