import { BattleState } from "../battleState";
import { San } from "../san";
import { addInstancedMeshesToSceneAndFlagForUpdate } from "./addInstancedMeshesToSceneAndFlagForUpdate";
import { resetThreeScene } from "./resetThreeScene";
import { main } from "./main";

export function updateThreeScene(battle: BattleState, san: San): void {
  resetThreeScene(san);
  main(battle, san);
  addInstancedMeshesToSceneAndFlagForUpdate(san);
}
