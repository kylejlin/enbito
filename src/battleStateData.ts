export interface BattleStateData {
  entities: any[];
  azukiKingId: Ref;
  edamameKingId: Ref;
  activeUnitIds: Ref[];
  activeTowerIds: Ref[];
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

export interface Ref {
  isEntityId: true;
  value: number;
}

export interface Soldier {
  position: Triple;
  animation: SoldierAnimationState;
  attackTargetId: null | Ref;
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
  orientation: Orientation;

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

export interface Orientation {
  yaw: number;
  pitch: number;
  roll: number;
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
  soldierIds: Ref[];
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
  soldierIds: Ref[];
  unitId: Ref;
}
