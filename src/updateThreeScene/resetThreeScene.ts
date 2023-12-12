import { InstancedMesh } from "three";
import { San } from "../san";

export function resetThreeScene(san: San): void {
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
  } = san.data;

  scene.remove(...scene.children);

  setCountsToZero(azukiSpearWalkFrames);
  setCountsToZero(azukiSpearStabFrames);
  setCountsToZero(edamameSpearWalkFrames);
  setCountsToZero(edamameSpearStabFrames);

  setCountsToZero(azukiUnarmedExplosionFrames);
  setCountsToZero(edamameUnarmedExplosionFrames);

  azukiBannerTowers.count = 0;
  edamameBannerTowers.count = 0;
}

function setCountsToZero(meshs: InstancedMesh[]): void {
  for (const mesh of meshs) {
    mesh.count = 0;
  }
}
