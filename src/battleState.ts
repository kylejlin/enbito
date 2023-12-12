import {
  BannerTower,
  BattleStateData,
  Dragonfly,
  King,
  Ref,
  Soldier,
  Unit,
} from "./battleStateData";

export class BattleState {
  constructor(public readonly data: BattleStateData) {}

  public addEntity(entity: unknown): Ref {
    const id: Ref = { isEntityId: true, value: this.data.entities.length };
    this.data.entities.push(entity);
    return id;
  }

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

  public getDragonfly(id: Ref): Dragonfly {
    return this.data.entities[id.value] as Dragonfly;
  }
}
