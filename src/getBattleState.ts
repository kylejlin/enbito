import { Vector3 } from "three";
import {
  Allegiance,
  BannerTower,
  BattleStateData,
  King,
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

  const azukiLegion = getUnit(entities, {
    start: [-50, 0, 100],
    forward: [0, 0, 1],
    dimensions: [10, 10],
    gap: [8, 8 * (Math.sqrt(3) / 2)],
    allegiance: Allegiance.Azuki,
  });
  entities.push(azukiLegion);

  const edamameLegion = getUnit(entities, {
    start: [50, 0, -100],
    forward: [0, 0, -1],
    dimensions: [10, 10],
    gap: [8, 8 * (Math.sqrt(3) / 2)],
    allegiance: Allegiance.Edamame,
  });
  entities.push(edamameLegion);

  // const towers = [
  //   getBannerTower({
  //     position: new Vector3(-50, 0, -100),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(50, 0, -100),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(400, 0, -400),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-400, 0, -400),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(0, 0, -1000),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(700, 0, -1600),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-700, 0, -1600),
  //     allegiance: Allegiance.Edamame,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-50, 0, 100),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(50, 0, 100),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(400, 0, 400),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-400, 0, 400),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(0, 0, 1000),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(700, 0, 1600),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  //   getBannerTower({
  //     position: new Vector3(-700, 0, 1600),
  //     allegiance: Allegiance.Azuki,
  //     assets,
  //   }),
  // ];
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

    plannedDeployment: { start: null, plannedUnit: null },
    soldierExplosions: [],
  };
}

function getDefaultAzukiKing(): King {
  return {
    isKing: true,
    position: [0, 0, 100],
    animation: {
      kind: SoldierAnimationKind.Idle,
      timeInSeconds: 0,
    },
    health: 100,
    yRot: 0,
    assemblyPoint: [0, 0, 0],
    dragonfly: {
      position: [0, 2.5, 105],
      isBeingRidden: false,
      isLanding: false,
      speed: 30,
      orientation: { yaw: 0, pitch: 0, roll: 0 },
      dismountTimer: 0,
    },
    attackTargetId: null,
    cameraPitch: 0,
  };
}

function getDefaultEdamameKing(): King {
  return {
    isKing: true,
    position: [0, 0, -100],
    animation: {
      kind: SoldierAnimationKind.Idle,
      timeInSeconds: 0,
    },
    health: 100,
    yRot: Math.PI,
    assemblyPoint: [0, 0, 0],
    dragonfly: {
      position: [0, 2.5, -105],
      isBeingRidden: false,
      isLanding: false,
      speed: 30,
      orientation: { yaw: 0, pitch: 0, roll: 0 },
      dismountTimer: 0,
    },
    attackTargetId: null,
    cameraPitch: 0,
  };
}

function getUnit(
  entities: any[],
  {
    start,
    forward,
    dimensions: [width, height],
    gap: [rightGap, backGap],
    allegiance,
  }: {
    start: Triple;
    forward: Triple;
    dimensions: [number, number];
    gap: [number, number];
    allegiance: Allegiance;
  }
): Unit {
  const rightStep = toThreeVec(forward)
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    .multiplyScalar(rightGap);
  const backStep = toThreeVec(forward)
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
        soldierPosition.z,
        allegiance
      );
      soldier.yRot = Math.atan2(forward[0], forward[2]);
      soldiers.push(soldier);
    }
  }
  const soldierIds: Ref[] = [];
  for (let i = 0; i < soldiers.length; ++i) {
    soldierIds.push({ isEntityId: true, value: entities.length });
    entities.push(soldiers[i]);
  }
  return {
    order: { kind: UnitOrderKind.Advance },
    soldierIds,
    forward,
    isPreview: false,
    allegiance,
    areSoldiersStillBeingAdded: false,
  };
}

function getSoldier(
  x: number,
  y: number,
  z: number,
  allegiance: Allegiance
): Soldier {
  return {
    position: [x, y, z],
    animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
    attackTargetId: null,
    health: 100,
    yRot: 0,
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
