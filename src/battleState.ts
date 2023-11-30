export interface BattleState {
  entities: any[];
  azukiKing: King;
  edamameKing: King;
  units: Unit[];
  towers: BannerTower[];
}

export enum UnitOrderKind {
  Advance,
  Assemble,
}

export enum SoldierAnimationKind {
  Idle,
  Walk,
  Stab,
  Slash,
}

export enum Allegiance {
  Azuki,
  Edamame,
}

export type Triple = [number, number, number];

export interface EntityId {
  isEntityId: true;
  value: number;
}

export interface Soldier {
  position: Triple;
  animation: SoldierAnimationState;
  attackTargetId: null | EntityId;
  health: number;
  yRot: number;
  assemblyPoint: Triple;
}

export interface SoldierAnimationState {
  kind: SoldierAnimationKind;
  timeInSeconds: number;
}

export interface King extends Soldier {
  isKing: true;
  // TODO: Refactor
  dragonfly: KingDragonfly;
}

export interface KingDragonfly {
  position: Triple;

  yaw: number;
  pitch: number;
  roll: number;

  isBeingRidden: boolean;
  isLanding: boolean;
  speed: number;

  /**
   * Once the dragonfly lands, the rider will wait a few seconds before dismounting.
   * `dismountTimer` keeps track of how many seconds are remaining.
   * The clock doesn't start until the dragonfly is on the ground and has
   * sufficiently low speed.
   */
  dismountTimer: number;
}

export type UnitOrder = AdvanceOrder | AssembleOrder;

interface AdvanceOrder {
  kind: UnitOrderKind.Advance;
}

interface AssembleOrder {
  kind: UnitOrderKind.Assemble;
}

export interface Unit {
  order: UnitOrder;
  soldiers: Soldier[];
  forward: Triple;
  isPreview: boolean;
  allegiance: Allegiance;
  areSoldiersStillBeingAdded: boolean;
}

export interface BannerTower {
  position: Triple;
  isPreview: boolean;
  allegiance: Allegiance;
  pendingUnits: BannerTowerPendingUnit[];
  secondsUntilNextSoldier: number;
}

export interface BannerTowerPendingUnit {
  soldierIds: EntityId[];
  unitId: EntityId;
}
