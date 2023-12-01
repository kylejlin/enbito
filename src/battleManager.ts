import { BattleState, King } from "./battleState";

export class BattleManager {
  constructor(public readonly state: BattleState) {}

  public getAzukiKing(): King {
    return this.state.entities[this.state.azukiKingId.value] as King;
  }

  public getEdamameKing(): King {
    return this.state.entities[this.state.edamameKingId.value] as King;
  }
}
