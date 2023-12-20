export interface BattleStateData {
  entities: any[];
  azukiKingId: Ref;
  edamameKingId: Ref;
  activeUnitIds: Ref[];
  activeTowerIds: Ref[];
  activeDragonflyIds: Ref[];

  azukiHand: Hand;
  edamameHand: Hand;

  soldierExplosions: SoldierExplosion[];
  pendingCommand: PendingCommand;
}

export enum UnitOrderKind {
  Advance,
  Storm,
  Assemble,
  Wheel,
  Standby,
  Retreat,
}

export enum SoldierAnimationKind {
  Idle,
  Walk,
  Stab,
  Slash,
}

export enum DragonflyAnimationKind {
  Fly,
  Idle,
}

export enum DragonflyFlightKind {
  Flying,
  Landing,
  Resting,
}

export enum Allegiance {
  Azuki,
  Edamame,
}

export enum PendingCommandKind {
  None,
  Deploy,
  SelectUnit,
  Wheel,
  Retreat,
}

export enum PlannedDeploymentKind {
  WithStart,
  WithPlannedUnit,
}

export type Triple = [number, number, number];

export interface Ref {
  isEntityId: true;
  value: number;
}

export interface Soldier {
  position: Triple;
  orientation: Orientation;
  animation: SoldierAnimationState;
  attackTargetId: null | Ref;
  health: number;
  assemblyPoint: Triple;
}

export interface SoldierAnimationState {
  kind: SoldierAnimationKind;
  timeInSeconds: number;
}

export interface King extends Soldier {
  isKing: true;
  hasExploded: boolean;
  dragonflyId: null | Ref;
  cameraPitch: number;
}

export interface Dragonfly {
  position: Triple;
  orientation: Orientation;

  flightState: DragonflyFlightState;
  speed: number;

  animation: DragonflyAnimationState;

  /**
   * Once the dragonfly lands, the rider will wait a few seconds before dismounting.
   * `dismountTimer` keeps track of how many seconds are remaining.
   * The clock doesn't start until the dragonfly is on the ground and has
   * sufficiently low speed.
   */
  dismountTimer: number;
}

export type DragonflyFlightState =
  | DragonflyFlyingState
  | DragonflyLandingState
  | DragonflyRestingState;

export interface DragonflyFlyingState {
  kind: DragonflyFlightKind.Flying;
}

export interface DragonflyLandingState {
  kind: DragonflyFlightKind.Landing;
}

export interface DragonflyRestingState {
  kind: DragonflyFlightKind.Resting;
}

export interface DragonflyAnimationState {
  kind: DragonflyAnimationKind;
  timeInSeconds: number;
}

export interface Orientation {
  yaw: number;
  pitch: number;
  roll: number;
}

export type UnitOrder =
  | AdvanceOrder
  | StormOrder
  | AssembleOrder
  | WheelOrder
  | StandbyOrder
  | RetreatOrder;

export interface AdvanceOrder {
  readonly kind: UnitOrderKind.Advance;
}

export interface StormOrder {
  readonly kind: UnitOrderKind.Storm;
}

export interface AssembleOrder {
  readonly kind: UnitOrderKind.Assemble;
}

export interface WheelOrder {
  readonly kind: UnitOrderKind.Wheel;
  destYaw: number;
  soldierDestPositions: SparseArray<Triple>;
}

export interface StandbyOrder {
  readonly kind: UnitOrderKind.Standby;
}

export interface RetreatOrder {
  readonly kind: UnitOrderKind.Retreat;
  idealRetreatPosition: Triple;
}

export interface Unit {
  isSelected: boolean;
  order: UnitOrder;
  soldierIds: Ref[];
  yaw: number;
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
  soldiers: PlannedSoldier[];
  unitId: Ref;
}

export type PlannedDeployment =
  | PlannedDeploymentWithStart
  | PlannedDeploymentWithPlannedUnit;

export interface PlannedDeploymentWithStart {
  kind: PlannedDeploymentKind.WithStart;
  start: Triple;
}

export interface PlannedDeploymentWithPlannedUnit {
  kind: PlannedDeploymentKind.WithPlannedUnit;
  plannedUnit: PlannedUnit;
}

export interface PlannedUnit {
  order: UnitOrder;
  soldiers: PlannedSoldier[];
  yaw: number;
  allegiance: Allegiance;
}

export interface PlannedSoldier {
  position: Triple;
  health: number;
  yRot: number;
  assemblyPoint: Triple;
}

export interface SoldierExplosion {
  allegiance: Allegiance;
  position: Triple;
  orientation: Orientation;
  timeInSeconds: number;
}

export interface Hand {
  spearCount: number;
}

export type PendingCommand =
  | NullPendingCommand
  | PendingDeploy
  | PendingSelectUnit
  | PendingWheel
  | PendingRetreat;

export interface NullPendingCommand {
  readonly kind: PendingCommandKind.None;
}

export interface PendingDeploy {
  readonly kind: PendingCommandKind.Deploy;
  plannedDeployment: PlannedDeployment;
}

export interface PendingSelectUnit {
  readonly kind: PendingCommandKind.SelectUnit;
}

export interface PendingWheel {
  readonly kind: PendingCommandKind.Wheel;
  originalSoldierTransforms: SparseArray<PosRot>;
  originalGroundCursorPosition: Triple;
}

export interface PendingRetreat {
  readonly kind: PendingCommandKind.Retreat;
}

export type PosRot = [Triple, Orientation];

export interface SparseArray<T> {
  [index: number]: T;
}
