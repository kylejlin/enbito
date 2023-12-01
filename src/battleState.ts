import { BattleStateData, King } from "./battleStateData";

export class BattleState {
  constructor(public readonly data: BattleStateData) {}

  public getAzukiKing(): King {
    return this.data.entities[this.data.azukiKingId.value] as King;
  }

  public getEdamameKing(): King {
    return this.data.entities[this.data.edamameKingId.value] as King;
  }
}
