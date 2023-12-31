import { Vector3 } from "three";
import {
  Allegiance,
  BannerTower,
  BattleStateData,
  Dragonfly,
  DragonflyAnimationKind,
  DragonflyFlightKind,
  King,
  PendingCommandKind,
  Ref,
  Soldier,
  SoldierAnimationKind,
  Triple,
  Unit,
  UnitOrderKind,
} from "./battleStateData";
import { toThreeVec } from "./geoUtils";

export function getDefaultBattleState(): BattleStateData {
  const entities = [];

  const azukiKing = getDefaultAzukiKing();
  entities.push(azukiKing);

  const edamameKing = getDefaultEdamameKing();
  entities.push(edamameKing);

  const azukiKingDragonfly: Dragonfly = {
    position: [0, 2.5, 25],
    orientation: { yaw: 0, pitch: 0, roll: 0 },
    flightState: { kind: DragonflyFlightKind.Resting },
    speed: 30,
    animation: { kind: DragonflyAnimationKind.Idle, timeInSeconds: 0 },
    dismountTimer: 0,
  };
  entities.push(azukiKingDragonfly);
  const azukiKingDragonflyId: Ref = {
    isEntityId: true,
    value: entities.indexOf(azukiKingDragonfly),
  };

  const azukiLegion = getUnit(entities, {
    start: [-50, 0, 70],
    yaw: 0,
    dimensions: [10, 10],
    gap: [8, 8 * (Math.sqrt(3) / 2)],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiLegion);

  const edamameLegion = getUnit(entities, {
    start: [50, 0, -70],
    yaw: Math.PI,
    dimensions: [10, 10],
    gap: [8, 8 * (Math.sqrt(3) / 2)],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameLegion);

  const edamameTower0 = getBannerTower({
    position: [-50, 0, -100],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower0);

  const edamameTower1 = getBannerTower({
    position: [50, 0, -100],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower1);

  const edamameTower2 = getBannerTower({
    position: [400, 0, -400],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower2);

  const edamameTower3 = getBannerTower({
    position: [-400, 0, -400],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower3);

  const edamameTower4 = getBannerTower({
    position: [0, 0, -1000],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower4);

  const edamameTower5 = getBannerTower({
    position: [700, 0, -1600],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower5);

  const edamameTower6 = getBannerTower({
    position: [-700, 0, -1600],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameTower6);

  const azukiTower0 = getBannerTower({
    position: [-50, 0, 100],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower0);

  const azukiTower1 = getBannerTower({
    position: [50, 0, 100],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower1);

  const azukiTower2 = getBannerTower({
    position: [400, 0, 400],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower2);

  const azukiTower3 = getBannerTower({
    position: [-400, 0, 400],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower3);

  const azukiTower4 = getBannerTower({
    position: [0, 0, 1000],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower4);

  const azukiTower5 = getBannerTower({
    position: [700, 0, 1600],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower5);

  const azukiTower6 = getBannerTower({
    position: [-700, 0, 1600],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiTower6);

  return {
    entities,
    azukiKingId: { isEntityId: true, value: entities.indexOf(azukiKing) },
    edamameKingId: { isEntityId: true, value: entities.indexOf(edamameKing) },
    activeUnitIds: [
      { isEntityId: true, value: entities.indexOf(azukiLegion) },
      { isEntityId: true, value: entities.indexOf(edamameLegion) },
    ],
    activeTowerIds: [
      { isEntityId: true, value: entities.indexOf(azukiTower0) },
      { isEntityId: true, value: entities.indexOf(azukiTower1) },
      { isEntityId: true, value: entities.indexOf(azukiTower2) },
      { isEntityId: true, value: entities.indexOf(azukiTower3) },
      { isEntityId: true, value: entities.indexOf(azukiTower4) },
      { isEntityId: true, value: entities.indexOf(azukiTower5) },
      { isEntityId: true, value: entities.indexOf(azukiTower6) },
      { isEntityId: true, value: entities.indexOf(edamameTower0) },
      { isEntityId: true, value: entities.indexOf(edamameTower1) },
      { isEntityId: true, value: entities.indexOf(edamameTower2) },
      { isEntityId: true, value: entities.indexOf(edamameTower3) },
      { isEntityId: true, value: entities.indexOf(edamameTower4) },
      { isEntityId: true, value: entities.indexOf(edamameTower5) },
      { isEntityId: true, value: entities.indexOf(edamameTower6) },
    ],
    activeDragonflyIds: [azukiKingDragonflyId],

    azukiHand: { spearCount: 0 },
    edamameHand: { spearCount: 0 },

    soldierExplosions: [],
    pendingCommand: { kind: PendingCommandKind.None },
  };
}

function getDefaultAzukiKing(): King {
  return {
    isKing: true,
    hasExploded: false,
    position: [0, 0, 20],
    orientation: { yaw: 0, pitch: 0, roll: 0 },
    animation: {
      kind: SoldierAnimationKind.Idle,
      timeInSeconds: 0,
    },
    health: 100,
    assemblyPoint: [0, 0, 0],
    dragonflyId: null,
    attackTargetId: null,
    cameraPitch: 0,
  };
}

function getDefaultEdamameKing(): King {
  return {
    isKing: true,
    hasExploded: false,
    position: [0, 0, -100],
    orientation: { yaw: Math.PI, pitch: 0, roll: 0 },
    animation: {
      kind: SoldierAnimationKind.Idle,
      timeInSeconds: 0,
    },
    health: 100,
    assemblyPoint: [0, 0, 0],
    dragonflyId: null,
    attackTargetId: null,
    cameraPitch: 0,
  };
}

function getUnit(
  entities: any[],
  {
    start,
    yaw,
    dimensions: [width, height],
    gap: [rightGap, backGap],
    allegiance,
  }: {
    start: Triple;
    yaw: number;
    dimensions: [number, number];
    gap: [number, number];
    allegiance: Allegiance;
  }
): Unit {
  const rightStep = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    .multiplyScalar(rightGap);
  const backStep = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
    .multiplyScalar(backGap);
  const soldiers: Soldier[] = [];
  for (let right = 0; right < width; ++right) {
    for (let back = 0; back < height; ++back) {
      const soldierPosition = toThreeVec(start)
        .clone()
        .add(rightStep.clone().multiplyScalar(right + 0.5 * (back & 1)))
        .add(backStep.clone().multiplyScalar(back));
      const soldier = getSoldier(
        soldierPosition.x,
        soldierPosition.y,
        soldierPosition.z
      );
      soldier.orientation.yaw = yaw;
      soldiers.push(soldier);
    }
  }
  const soldierIds: Ref[] = [];
  for (let i = 0; i < soldiers.length; ++i) {
    soldierIds.push({ isEntityId: true, value: entities.length });
    entities.push(soldiers[i]);
  }
  return {
    isSelected: false,
    order: { kind: UnitOrderKind.Storm },
    soldierIds,
    yaw,
    isPreview: false,
    allegiance,
    areSoldiersStillBeingAdded: false,
  };
}

function getSoldier(x: number, y: number, z: number): Soldier {
  return {
    position: [x, y, z],
    animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
    attackTargetId: null,
    health: 100,
    orientation: { yaw: 0, pitch: 0, roll: 0 },
    assemblyPoint: [0, 0, 0],
  };
}

function getBannerTower({
  position,
  allegiance,
}: {
  position: Triple;
  allegiance: Allegiance;
}): BannerTower {
  return {
    position,
    isPreview: false,
    allegiance,
    pendingUnits: [],
    secondsUntilNextSoldier: 0,
  };
}
