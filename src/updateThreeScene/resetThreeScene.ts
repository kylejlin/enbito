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

    azukiSafezoneMarker,
    edamameSafezoneMarker,

    blueSphere: selectedSoldierMarker,
    flashingBlueSphere: tentativelySelectedSoldierMarker,

    dragonflies,
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

  azukiSafezoneMarker.count = 0;
  edamameSafezoneMarker.count = 0;

  selectedSoldierMarker.count = 0;
  tentativelySelectedSoldierMarker.count = 0;

  dragonflies.count = 0;
}

function setCountsToZero(meshs: InstancedMesh[]): void {
  for (const mesh of meshs) {
    mesh.count = 0;
  }
}
