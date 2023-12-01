import {
  BannerTower,
  BattleStateData,
  King,
  Ref,
  Soldier,
  Unit,
} from "./battleStateData";

export class BattleState {
  constructor(public readonly data: BattleStateData) {}

  public getAzukiKing(): King {
    return this.data.entities[this.data.azukiKingId.value] as King;
  }

  public getEdamameKing(): King {
    return this.data.entities[this.data.edamameKingId.value] as King;
  }

  public getUnit(id: Ref): Unit {
    return this.data.entities[id.value] as Unit;
  }

  public getSoldier(id: Ref): Soldier {
    return this.data.entities[id.value] as Soldier;
  }

  public getBannerTower(id: Ref): BannerTower {
    return this.data.entities[id.value] as BannerTower;
  }
}
