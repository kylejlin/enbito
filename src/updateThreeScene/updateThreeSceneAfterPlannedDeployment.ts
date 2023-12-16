import { Object3D, Vector3 } from "three";
import { BattleState } from "../battleState";
import { San } from "../san";
import { PendingCommandKind } from "../battleStateData";

// TODO: Examine if this is really necessary.
// It may be possible just to perform this in the first updateThree pass.
// This would require us to dynamically compute the plannedDeployment info,
// since we wouldn't be able to depend on the post-tick logic anymore
// (we currently depend on the post-tick logic to update the plannedDeployment,
// which is why we run this function after the post-tick).
export function updateThreeSceneAfterPlannedDeployment(
  battle: BattleState,
  san: San
): void {
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind !== PendingCommandKind.Deploy) {
    return;
  }

  const { plannedDeployment } = pendingCommand;

  const bPlannedUnit = plannedDeployment.plannedUnit;
  if (bPlannedUnit === null) {
    return;
  }

  const temp = new Object3D();
  for (const bSoldier of bPlannedUnit.soldiers) {
    temp.position.set(...bSoldier.position);
    temp.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), bSoldier.yRot);

    const instancedMesh = san.data.azukiSpearWalkFrames[0];

    temp.updateMatrix();
    instancedMesh.setMatrixAt(instancedMesh.count, temp.matrix);
    ++instancedMesh.count;
  }
}
