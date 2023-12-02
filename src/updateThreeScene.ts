import { BattleState } from "./battleState";
import { San } from "./san";

export function updateThreeScene(battle: BattleState, san: San): void {
  const { scene, sky } = san.data;
  scene.remove(...scene.children);

  scene.add(sky);
}
