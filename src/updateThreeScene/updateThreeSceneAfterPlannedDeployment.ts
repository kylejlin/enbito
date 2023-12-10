import { Object3D, Vector3 } from "three";
import { BattleState } from "../battleState";
import { San } from "../san";

export function updateThreeSceneAfterPlannedDeployment(
  battle: BattleState,
  san: San
): void {
  const bPlannedUnit = battle.data.plannedDeployment.plannedUnit;
  if (bPlannedUnit === null) {
    return;
  }

  const temp = new Object3D();
  for (const bSoldier of bPlannedUnit.soldiers) {
    temp.position.set(
      bSoldier.position[0],
      bSoldier.position[1],
      bSoldier.position[2]
    );
    temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), bSoldier.yRot);

    const instancedMesh = san.data.azukiSpearWalkFrames[0];

    temp.updateMatrix();
    instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
    ++instancedMesh.count;
  }
}
