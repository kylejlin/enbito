import { ModelConstants } from "./assets";
import { Vector3 } from "three";
import {
  AdvanceOrder,
  Allegiance,
  AssembleOrder,
  BannerTower,
  Dragonfly,
  DragonflyAnimationKind,
  DragonflyFlightKind,
  Orientation,
  PlannedSoldier,
  PlannedUnit,
  Ref,
  Soldier,
  SoldierAnimationKind,
  SoldierAnimationState,
  SoldierExplosion,
  StormOrder,
  Triple,
  Unit,
  UnitOrderKind,
} from "./battleStateData";
import { BattleState } from "./battleState";
import * as geoUtils from "./geoUtils";
import { getGroundCursorPosition } from "./groundCursor";
import { Resources } from "./resourceBundle";
import {
  TURN_SPEED_RAD_PER_SEC,
  SPEAR_ATTACK_RANGE_SQUARED,
  STAB_DAMAGE,
  STAB_COOLDOWN,
  SLASH_DAMAGE,
  SOLDIER_DEPLOYMENT_DELAY_SECONDS,
  ASSEMBLING_TROOP_SPEEDUP_FACTOR,
  MAX_LANDING_SPEED,
  DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED,
  DRAGONFLY_MIN_SPEED,
  STAB_TIME_SCALE,
  MAX_STAB_DELAY,
  DRAGONFLY_MAX_SPEED,
  DRAGONFLY_ACCELERATION,
  DRAGONFLY_DECELERATION,
  MILLISECS_PER_TICK,
  BANNERTOWER_SAFEZONE_RANGE_SQUARED,
  KING_OUT_OF_SAFEZONE_DAMAGE_PER_SECOND,
} from "./gameConsts";

let hasAlerted = false;
function alertOnceAfterDelay(message: string): void {
  if (!hasAlerted) {
    hasAlerted = true;
    setTimeout(() => alert(message), 2e3);
  }
}

export function tick(resources: Resources): void {
  const elapsedTimeInMillisecs = MILLISECS_PER_TICK;
  const elapsedTimeInSeconds = elapsedTimeInMillisecs / 1000;

  tickDragonflies(elapsedTimeInSeconds, resources);
  tickKings(elapsedTimeInSeconds, resources);
  tickUnits(elapsedTimeInSeconds, resources);
  tickBannerTowers(elapsedTimeInSeconds, resources);
  tickSoldierExplosions(elapsedTimeInSeconds, resources);
}

function startOrContinueWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): void {
  const timeScale = 1;
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind !== SoldierAnimationKind.Walk) {
    animation.kind = SoldierAnimationKind.Walk;
    animation.timeInSeconds = 0;
  } else {
    animation.timeInSeconds =
      (animation.timeInSeconds + elapsedTimeInSeconds) % scaledWalkClipDuration;
  }
}

/** Returns whether the animation crosses the damage point during this tick. */
function startOrContinueSlashAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  const timeScale = 1;
  const scaledSlashClipDuration = mcon.azukiKingSlashClipDuration / timeScale;
  if (animation.kind !== SoldierAnimationKind.Slash) {
    animation.kind = SoldierAnimationKind.Slash;
    animation.timeInSeconds = 0;
    return false;
  } else {
    // We should deal damage on slash animation frame 18.
    const SLASH_DAMAGE_POINT_LOCATION_FACTOR = 18 / 30;
    const damageTime =
      scaledSlashClipDuration * SLASH_DAMAGE_POINT_LOCATION_FACTOR;
    const finishes =
      animation.timeInSeconds < damageTime &&
      animation.timeInSeconds + elapsedTimeInSeconds >= damageTime;
    animation.timeInSeconds =
      (animation.timeInSeconds + elapsedTimeInSeconds) %
      scaledSlashClipDuration;
    return finishes;
  }
}

function stopWalkingAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): void {
  const timeScale = 1;
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind === SoldierAnimationKind.Walk) {
    const halfwayPoint = 0.5 * scaledWalkClipDuration;
    const reachesHalfwayPointThisTick =
      animation.timeInSeconds < halfwayPoint &&
      animation.timeInSeconds + elapsedTimeInSeconds >= halfwayPoint;
    const reachesEndThisTick =
      animation.timeInSeconds + elapsedTimeInSeconds >= scaledWalkClipDuration;

    if (reachesHalfwayPointThisTick || reachesEndThisTick) {
      animation.kind = SoldierAnimationKind.Idle;
      animation.timeInSeconds = 0;
    } else {
      animation.timeInSeconds += elapsedTimeInSeconds;
    }
  }
}

function stopWalkingAndStartStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  timeScale: number,
  mcon: ModelConstants
): void {
  const scaledWalkClipDuration = mcon.azukiSpearWalkClipDuration / timeScale;
  if (animation.kind === SoldierAnimationKind.Walk) {
    const halfwayPoint = 0.5 * scaledWalkClipDuration;
    const reachesHalfwayPointThisTick =
      animation.timeInSeconds < halfwayPoint &&
      animation.timeInSeconds + elapsedTimeInSeconds >= halfwayPoint;
    const reachesEndThisTick =
      animation.timeInSeconds + elapsedTimeInSeconds >= scaledWalkClipDuration;

    if (reachesHalfwayPointThisTick || reachesEndThisTick) {
      animation.kind = SoldierAnimationKind.Stab;
      // TODO: This is just a hack.
      // Ideally, timeInSeconds should never be negative.
      animation.timeInSeconds = -Math.random() * MAX_STAB_DELAY;
    } else {
      animation.timeInSeconds += elapsedTimeInSeconds;
    }
  }
}

const STAB_DAMAGE_POINT_LOCATION_FACTOR = 10 / 24;

/** Returns whether the animation crosses the damage point during this tick. */
function continueStabThenIdleAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  const damageTime =
    mcon.azukiSpearStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR;
  const newTimeInSeconds =
    animation.timeInSeconds + elapsedTimeInSeconds * STAB_TIME_SCALE;
  const dealsDamageThisTick =
    animation.timeInSeconds < damageTime && newTimeInSeconds >= damageTime;

  animation.timeInSeconds = newTimeInSeconds;

  if (animation.timeInSeconds >= mcon.azukiSpearStabClipDuration) {
    animation.kind = SoldierAnimationKind.Idle;
    animation.timeInSeconds =
      (animation.timeInSeconds - mcon.azukiSpearStabClipDuration) /
      STAB_TIME_SCALE;
  }

  return dealsDamageThisTick;
}

/** Returns whether the animation crosses the damage point during this tick. */
function continueIdleThenStabAnimation(
  elapsedTimeInSeconds: number,
  animation: SoldierAnimationState,
  mcon: ModelConstants
): boolean {
  animation.timeInSeconds += elapsedTimeInSeconds;
  if (animation.timeInSeconds >= STAB_COOLDOWN) {
    animation.kind = SoldierAnimationKind.Stab;
    animation.timeInSeconds =
      (animation.timeInSeconds - STAB_COOLDOWN) * STAB_TIME_SCALE -
      // TODO: This is just a hack.
      // Ideally, timeInSeconds should never be negative.
      Math.random() * MAX_STAB_DELAY;

    return (
      animation.timeInSeconds >=
      mcon.azukiSpearStabClipDuration * STAB_DAMAGE_POINT_LOCATION_FACTOR
    );
  }

  return false;
}

function tickKings(elapsedTimeInSeconds: number, resources: Resources): void {
  const azukiKing = resources.battle.getAzukiKing();
  const edamameKing = resources.battle.getEdamameKing();

  performDragonflyRelatedLogicForAzukiKingTick(elapsedTimeInSeconds, resources);

  tickKingBoundaries(resources);

  if (azukiKing.health <= 0) {
    if (!azukiKing.hasExploded) {
      const azukiExplosion = getSoldierExplosion(
        Allegiance.Azuki,
        azukiKing.position,
        azukiKing.orientation
      );
      resources.battle.data.soldierExplosions.push(azukiExplosion);
      azukiKing.hasExploded = true;
      alertOnceAfterDelay("Edamame wins!");
    }
  }

  if (edamameKing.health <= 0) {
    if (!edamameKing.hasExploded) {
      const edamameExplosion = getSoldierExplosion(
        Allegiance.Edamame,
        edamameKing.position,
        edamameKing.orientation
      );
      resources.battle.data.soldierExplosions.push(edamameExplosion);
      edamameKing.hasExploded = true;
      alertOnceAfterDelay("Azuki wins!");
    }
  }
}

function performDragonflyRelatedLogicForAzukiKingTick(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const azukiKing = resources.battle.getAzukiKing();
  const { keys, mouse, battle } = resources;
  const { mcon } = resources.san.data;

  if (
    azukiKing.dragonflyId !== null &&
    resources.battle.getDragonfly(azukiKing.dragonflyId).flightState.kind ===
      DragonflyFlightKind.Resting
  ) {
    azukiKing.dragonflyId = null;

    azukiKing.position[1] = 0;
  }

  if (azukiKing.dragonflyId !== null) {
    const azukiKingDragonfly = resources.battle.getDragonfly(
      azukiKing.dragonflyId
    );
    if (keys.t) {
      azukiKingDragonfly.speed = Math.min(
        DRAGONFLY_MAX_SPEED,
        azukiKingDragonfly.speed + DRAGONFLY_ACCELERATION * elapsedTimeInSeconds
      );
    }
    if (keys.g) {
      azukiKingDragonfly.speed = Math.max(
        DRAGONFLY_MIN_SPEED,
        azukiKingDragonfly.speed - DRAGONFLY_DECELERATION * elapsedTimeInSeconds
      );
    }

    if (azukiKingDragonfly.flightState.kind === DragonflyFlightKind.Landing) {
      if (
        azukiKingDragonfly.position[1] <= 2.5 &&
        azukiKingDragonfly.speed < 5
      ) {
      } else {
        azukiKing.orientation.yaw = azukiKingDragonfly.orientation.yaw;

        geoUtils.setTriple(azukiKing.position, azukiKingDragonfly.position);
        geoUtils.setOrientation(
          azukiKing.orientation,
          azukiKingDragonfly.orientation
        );
        geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);
      }
    } else {
      let wrappedMouseX = mouse.x;
      while (wrappedMouseX > 1) {
        wrappedMouseX -= 1;
      }
      while (wrappedMouseX < -1) {
        wrappedMouseX += 1;
      }

      geoUtils.setTriple(azukiKing.position, azukiKingDragonfly.position);
      geoUtils.setOrientation(
        azukiKing.orientation,
        azukiKingDragonfly.orientation
      );
      geoUtils.translateZ(azukiKing.position, azukiKing.orientation, -0.3);
    }
  } else {
    if (keys.w) {
      startOrContinueWalkingAnimation(
        elapsedTimeInSeconds,
        azukiKing.animation,
        mcon
      );
    } else {
      stopWalkingAnimation(elapsedTimeInSeconds, azukiKing.animation, mcon);
    }

    if (
      azukiKing.animation.kind === SoldierAnimationKind.Slash ||
      (keys.space && azukiKing.animation.kind === SoldierAnimationKind.Idle)
    ) {
      const slashActionTimeScale = 1;
      const finishesSlashCycleThisTick =
        azukiKing.animation.timeInSeconds + elapsedTimeInSeconds >=
        mcon.azukiKingSlashClipDuration / slashActionTimeScale;
      const dealsDamageThisTick = startOrContinueSlashAnimation(
        elapsedTimeInSeconds,
        azukiKing.animation,
        mcon
      );
      if (dealsDamageThisTick) {
        applyKingSlashDamage(Allegiance.Azuki, resources.battle);
      }
      if (finishesSlashCycleThisTick && !keys.space) {
        azukiKing.animation = {
          kind: SoldierAnimationKind.Idle,
          timeInSeconds: 0,
        };
      }
    }

    if (azukiKing.animation.kind === SoldierAnimationKind.Walk) {
      geoUtils.translateZ(
        azukiKing.position,
        azukiKing.orientation,
        -3 * elapsedTimeInSeconds
      );
    }
  }

  if (azukiKing.dragonflyId === null && keys.r && mouse.isLocked) {
    const nearestRestingDragonflyId = getNearestRestingDragonflyId(
      azukiKing.position,
      battle
    );
    if (
      nearestRestingDragonflyId !== null &&
      geoUtils.distanceToSquared(
        azukiKing.position,
        battle.getDragonfly(nearestRestingDragonflyId).position
      ) <= DRAGONFLY_MOUNTING_MAX_DISTANCE_SQUARED
    ) {
      const nearestRestingDragonfly = battle.getDragonfly(
        nearestRestingDragonflyId
      );
      mouse.x = 0.5;
      mouse.y = 0.5;
      nearestRestingDragonfly.flightState = {
        kind: DragonflyFlightKind.Flying,
      };
      nearestRestingDragonfly.animation = {
        kind: DragonflyAnimationKind.Fly,
        timeInSeconds: 0,
      };
      nearestRestingDragonfly.speed = DRAGONFLY_MIN_SPEED;
      azukiKing.dragonflyId = nearestRestingDragonflyId;
    }
  }

  if (
    azukiKing.dragonflyId !== null &&
    battle.getDragonfly(azukiKing.dragonflyId).flightState.kind ===
      DragonflyFlightKind.Flying &&
    (battle.getDragonfly(azukiKing.dragonflyId).position[1] <= 0 ||
      getCollidingBannerTower(
        battle.getDragonfly(azukiKing.dragonflyId).position,
        battle
      ) !== null)
  ) {
    azukiKing.health = 0;
    azukiKing.dragonflyId = null;
  }
}

function tickDragonflies(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { battle } = resources;
  for (const id of battle.data.activeDragonflyIds) {
    const dragonfly = battle.getDragonfly(id);
    tickDragonfly(dragonfly, elapsedTimeInSeconds, resources);
  }
}

function tickDragonfly(
  dragonfly: Dragonfly,
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { mouse, keys } = resources;
  const { mcon } = resources.san.data;

  if (dragonfly.animation.kind === DragonflyAnimationKind.Fly) {
    dragonfly.animation.timeInSeconds =
      (dragonfly.animation.timeInSeconds + elapsedTimeInSeconds * 5) %
      mcon.dragonflyFlyClipDuration;
  }

  if (dragonfly.flightState.kind === DragonflyFlightKind.Flying) {
    // TODO
    let wrappedMouseX = mouse.x;
    while (wrappedMouseX > 1) {
      wrappedMouseX -= 1;
    }
    while (wrappedMouseX < -1) {
      wrappedMouseX += 1;
    }

    dragonfly.orientation.yaw +=
      0.5 * elapsedTimeInSeconds * (dragonfly.orientation.roll * 2);

    const { battle } = resources;
    const azukiKing = battle.getAzukiKing();
    const isAzukiKingDragonfly =
      azukiKing.dragonflyId !== null &&
      dragonfly === battle.getDragonfly(azukiKing.dragonflyId);
    if (isAzukiKingDragonfly) {
      dragonfly.orientation.roll = -(mouse.x - 0.5) * Math.PI;
      dragonfly.orientation.pitch = -(mouse.y - 0.5) * Math.PI;
    }

    geoUtils.translateZ(
      dragonfly.position,
      dragonfly.orientation,
      dragonfly.speed * -elapsedTimeInSeconds
    );

    // TODO: Generalize isLanding to include NPCs.
    const isLanding = isAzukiKingDragonfly && keys.v;
    if (
      dragonfly.position[1] < 10 &&
      dragonfly.speed <= MAX_LANDING_SPEED &&
      isLanding
    ) {
      dragonfly.flightState = {
        kind: DragonflyFlightKind.Landing,
      };
      dragonfly.dismountTimer = 1.5;
    }
  }

  if (dragonfly.flightState.kind === DragonflyFlightKind.Landing) {
    if (dragonfly.position[1] <= 2.5 && dragonfly.speed < 5) {
      dragonfly.dismountTimer -= elapsedTimeInSeconds;
      if (dragonfly.dismountTimer <= 0) {
        // TODO: Dismount
        // azukiKingDragonfly.isBeingRidden = false;
        dragonfly.flightState = {
          kind: DragonflyFlightKind.Resting,
        };
        dragonfly.animation = {
          kind: DragonflyAnimationKind.Idle,
          timeInSeconds: 0,
        };
      }
    } else {
      dragonfly.orientation.yaw +=
        0.5 * elapsedTimeInSeconds * (dragonfly.orientation.roll * 2);
      dragonfly.orientation.pitch = limitTurn(
        dragonfly.orientation.pitch,
        0,
        0.5 * Math.PI * elapsedTimeInSeconds
      );
      dragonfly.orientation.roll = limitTurn(
        dragonfly.orientation.roll,
        0,
        0.2 * Math.PI * elapsedTimeInSeconds
      );

      if (
        dragonfly.orientation.pitch === 0 &&
        dragonfly.orientation.roll === 0
      ) {
        dragonfly.speed = Math.max(
          0,
          dragonfly.speed * 0.6 ** elapsedTimeInSeconds
        );
        dragonfly.position[1] = Math.max(
          2.5,
          dragonfly.position[1] * 0.7 ** elapsedTimeInSeconds
        );
      }

      geoUtils.translateZ(
        dragonfly.position,
        dragonfly.orientation,
        dragonfly.speed * -elapsedTimeInSeconds
      );
    }
  }
}

function tickUnits(elapsedTimeInSeconds: number, resources: Resources): void {
  const { battle } = resources;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    const { soldierIds } = unit;
    for (let i = 0; i < soldierIds.length; ++i) {
      const soldierId = soldierIds[i];
      const soldier = battle.getSoldier(soldierId);
      if (soldier.health <= 0) {
        // scene.remove(soldier.gltf.scene);
        const explosion = getSoldierExplosion(
          unit.allegiance,
          soldier.position,
          soldier.orientation
        );
        battle.data.soldierExplosions.push(explosion);
        if (unit.allegiance === Allegiance.Azuki) {
          ++battle.data.edamameHand.spearCount;
        } else {
          ++battle.data.azukiHand.spearCount;
        }
        soldierIds.splice(i, 1);
        --i;
        continue;
      }
    }
  }

  for (const unitId of battle.data.activeUnitIds) {
    tickUnit(elapsedTimeInSeconds, unitId, resources);
  }
}

function tickUnit(
  elapsedTimeInSeconds: number,
  unitId: Ref,
  resources: Resources
): void {
  const unit = resources.battle.getUnit(unitId);
  switch (unit.order.kind) {
    case UnitOrderKind.Advance:
      tickUnitWithAdvanceOrder(
        elapsedTimeInSeconds,
        unit,
        unit.order,
        resources
      );
      return;
    case UnitOrderKind.Storm:
      tickUnitWithStormOrder(elapsedTimeInSeconds, unit, unit.order, resources);
      return;
    case UnitOrderKind.Assemble:
      tickUnitWithAssembleOrder(
        elapsedTimeInSeconds,
        unit,
        unit.order,
        resources
      );
      return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _exhaustiveCheck: never = unit.order;
}

// TODO: Refactor to match `tickUnitWithStormOrder`.
function tickUnitWithAdvanceOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: AdvanceOrder,
  resources: Resources
): void {
  const { assets, battle } = resources;

  const { soldierIds } = unit;

  const wasAnySoldierFighting = soldierIds.some(
    (soldierId) => battle.getSoldier(soldierId).attackTargetId !== null
  );
  if (!wasAnySoldierFighting) {
    const forwardAngle = Math.atan2(unit.forward[0], unit.forward[2]);
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      const nearestEnemy = getNearestEnemyId(
        soldier,
        unit,
        SPEAR_ATTACK_RANGE_SQUARED,
        resources
      );
      if (nearestEnemy !== null) {
        soldier.attackTargetId = nearestEnemy;
      } else {
        const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
        soldier.orientation.yaw = limitTurn(
          soldier.orientation.yaw,
          forwardAngle,
          radiansPerTick
        );
        if (soldier.orientation.yaw === forwardAngle) {
          startOrContinueWalkingAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          geoUtils.translateZ(
            soldier.position,
            soldier.orientation,
            -1.5 * elapsedTimeInSeconds
          );
        }
      }
    }
  } else {
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      if (
        soldier.attackTargetId !== null &&
        battle.getSoldier(soldier.attackTargetId).health <= 0
      ) {
        soldier.attackTargetId = null;
      }

      if (soldier.attackTargetId === null) {
        const nearestEnemy = getNearestEnemyId(
          soldier,
          unit,
          SPEAR_ATTACK_RANGE_SQUARED,
          resources
        );
        if (nearestEnemy !== null) {
          soldier.attackTargetId = nearestEnemy;
        }
      }

      if (soldier.animation.kind === SoldierAnimationKind.Walk) {
        stopWalkingAndStartStabAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          1,
          assets.mcon
        );
      }

      if (soldier.attackTargetId !== null) {
        const attackTarget = battle.getSoldier(soldier.attackTargetId);
        const difference = geoUtils.sub(
          attackTarget.position,
          soldier.position
        );
        const desiredYRot =
          Math.atan2(difference[0], difference[2]) + Math.PI + 0.05;
        const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
        soldier.orientation.yaw = limitTurn(
          soldier.orientation.yaw,
          desiredYRot,
          radiansPerTick
        );

        if (soldier.animation.kind === SoldierAnimationKind.Stab) {
          const dealsDamageThisTick = continueStabThenIdleAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        } else if (soldier.animation.kind === SoldierAnimationKind.Idle) {
          const dealsDamageThisTick = continueIdleThenStabAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        }
      }
    }
  }
}

function tickUnitWithStormOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: StormOrder,
  resources: Resources
): void {
  const { assets, battle } = resources;

  const { soldierIds } = unit;

  for (const soldierId of soldierIds) {
    const soldier = battle.getSoldier(soldierId);
    if (
      soldier.attackTargetId !== null &&
      (battle.getSoldier(soldier.attackTargetId).health <= 0 ||
        geoUtils.distanceToSquared(
          soldier.position,
          battle.getSoldier(soldier.attackTargetId).position
        ) > SPEAR_ATTACK_RANGE_SQUARED)
    ) {
      soldier.attackTargetId = null;
    }

    const nearestEnemy = getNearestEnemyId(
      soldier,
      unit,
      SPEAR_ATTACK_RANGE_SQUARED,
      resources
    );

    if (soldier.attackTargetId === null) {
      soldier.attackTargetId = nearestEnemy;
    }

    if (soldier.attackTargetId !== null) {
      if (soldier.animation.kind === SoldierAnimationKind.Walk) {
        stopWalkingAndStartStabAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          1,
          assets.mcon
        );
      }

      const attackTarget = battle.getSoldier(soldier.attackTargetId);
      const difference = geoUtils.sub(attackTarget.position, soldier.position);
      const desiredYRot =
        Math.atan2(difference[0], difference[2]) + Math.PI + 0.05;
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );

      if (soldier.animation.kind === SoldierAnimationKind.Idle) {
        if (desiredYRot === soldier.orientation.yaw) {
          // We only progress the idle timer if we're pointing the correct direction.
          const dealsDamageThisTick = continueIdleThenStabAnimation(
            elapsedTimeInSeconds,
            soldier.animation,
            assets.mcon
          );
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        }
      }

      if (soldier.animation.kind === SoldierAnimationKind.Stab) {
        // We progress the stab animation regardless of whether we're pointing the correct direction.
        const dealsDamageThisTick = continueStabThenIdleAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          assets.mcon
        );
        // However, we only deal damage if
        // we're pointing the correct direction.
        if (desiredYRot === soldier.orientation.yaw) {
          if (dealsDamageThisTick) {
            attackTarget.health -= STAB_DAMAGE;
          }
        }
      }
    } else {
      // `else` condition: `soldier.attackTargetId === null`

      if (soldier.animation.kind === SoldierAnimationKind.Stab) {
        continueStabThenIdleAnimation(
          elapsedTimeInSeconds,
          soldier.animation,
          assets.mcon
        );
      } else if (
        soldier.animation.kind === SoldierAnimationKind.Idle ||
        soldier.animation.kind === SoldierAnimationKind.Walk
      ) {
        const forwardAngle = Math.atan2(unit.forward[0], unit.forward[2]);
        if (nearestEnemy !== null) {
          soldier.attackTargetId = nearestEnemy;
        } else {
          const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
          soldier.orientation.yaw = limitTurn(
            soldier.orientation.yaw,
            forwardAngle,
            radiansPerTick
          );
          if (soldier.orientation.yaw === forwardAngle) {
            startOrContinueWalkingAnimation(
              elapsedTimeInSeconds,
              soldier.animation,
              assets.mcon
            );
            geoUtils.translateZ(
              soldier.position,
              soldier.orientation,
              -1.5 * elapsedTimeInSeconds
            );
          }
        }
      }
    }
  }
}

function tickUnitWithAssembleOrder(
  elapsedTimeInSeconds: number,
  unit: Unit,
  order: AssembleOrder,
  resources: Resources
): void {
  const { battle } = resources;

  let isUnitStillAssembling = false;

  for (const soldierId of unit.soldierIds) {
    const soldier = battle.getSoldier(soldierId);

    let isReadyForCombat = false;

    const difference = geoUtils.sub(soldier.assemblyPoint, soldier.position);
    if (geoUtils.lengthSquared(difference) < 0.1) {
      const desiredYRot = Math.atan2(unit.forward[0], unit.forward[2]);
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );
      stopWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        resources.assets.mcon
      );

      if (
        soldier.animation.kind === SoldierAnimationKind.Idle &&
        soldier.orientation.yaw === desiredYRot
      ) {
        isReadyForCombat = true;
      }
    } else {
      const desiredYRot = Math.atan2(difference[0], difference[2]) + Math.PI;
      const radiansPerTick = elapsedTimeInSeconds * TURN_SPEED_RAD_PER_SEC;
      soldier.orientation.yaw = limitTurn(
        soldier.orientation.yaw,
        desiredYRot,
        radiansPerTick
      );
      startOrContinueWalkingAnimation(
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * elapsedTimeInSeconds,
        soldier.animation,
        resources.assets.mcon
      );
      geoUtils.translateZ(
        soldier.position,
        soldier.orientation,
        ASSEMBLING_TROOP_SPEEDUP_FACTOR * -1.5 * elapsedTimeInSeconds
      );
    }

    if (soldier.health > 0 && !isReadyForCombat) {
      isUnitStillAssembling = true;
    }
  }

  if (!unit.areSoldiersStillBeingAdded && !isUnitStillAssembling) {
    unit.order = { kind: UnitOrderKind.Storm };
  }
}

function getNearestEnemyId(
  soldier: Soldier,
  soldierUnit: Unit,
  rangeSquared: number,
  { battle }: Resources
): null | Ref {
  const azukiKing = battle.getAzukiKing();
  const edamameKing = battle.getEdamameKing();

  let nearestEnemyId: Ref | null = null;
  let nearestDistanceSquared = Infinity;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === soldierUnit.allegiance || unit.isPreview) {
      continue;
    }

    for (const enemyId of unit.soldierIds) {
      const enemy = battle.getSoldier(enemyId);
      const distSq = geoUtils.distanceToSquared(
        soldier.position,
        enemy.position
      );
      if (distSq < nearestDistanceSquared) {
        nearestEnemyId = enemyId;
        nearestDistanceSquared = distSq;
      }
    }
  }

  if (soldierUnit.allegiance !== Allegiance.Azuki) {
    const distSq = geoUtils.distanceToSquared(
      soldier.position,
      azukiKing.position
    );
    if (distSq < nearestDistanceSquared && azukiKing.health > 0) {
      nearestEnemyId = battle.data.azukiKingId;
      nearestDistanceSquared = distSq;
    }
  }

  if (soldierUnit.allegiance !== Allegiance.Edamame) {
    const distSq = geoUtils.distanceToSquared(
      soldier.position,
      edamameKing.position
    );
    if (distSq < nearestDistanceSquared && edamameKing.health > 0) {
      nearestEnemyId = battle.data.edamameKingId;
      nearestDistanceSquared = distSq;
    }
  }

  if (nearestDistanceSquared > rangeSquared) {
    return null;
  }

  return nearestEnemyId;
}

function limitTurn(
  currentAngle: number,
  desiredAngle: number,
  maxChange: number
): number {
  let difference = desiredAngle - currentAngle;
  while (difference > Math.PI) {
    difference -= Math.PI * 2;
  }
  while (difference < -Math.PI) {
    difference += Math.PI * 2;
  }

  const absDifference = Math.abs(difference);
  if (absDifference <= maxChange) {
    return desiredAngle;
  }
  return currentAngle + maxChange * Math.sign(difference);
}

const UNOCCUPIED = Symbol();
const CONTESTED = Symbol();
function tickBannerTowers(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { battle } = resources;
  for (const towerId of battle.data.activeTowerIds) {
    tickBannerTower(elapsedTimeInSeconds, towerId, resources);
  }
}

function tickBannerTower(
  elapsedTimeInSeconds: number,
  towerId: Ref,
  { assets, battle }: Resources
): void {
  const tower = battle.getBannerTower(towerId);

  if (tower.isPreview) {
    return;
  }

  let uniqueOccupier: typeof UNOCCUPIED | typeof CONTESTED | Allegiance =
    UNOCCUPIED;

  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (
      uniqueOccupier === CONTESTED ||
      uniqueOccupier === unit.allegiance ||
      unit.isPreview
    ) {
      break;
    }

    const { soldierIds } = unit;
    for (const soldierId of soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      if (inTowerTerritory(soldier.position, tower.position)) {
        if (uniqueOccupier === UNOCCUPIED) {
          uniqueOccupier = unit.allegiance;
        } else if (uniqueOccupier !== unit.allegiance) {
          uniqueOccupier = CONTESTED;
          break;
        }
      }
    }
  }

  if (
    uniqueOccupier !== UNOCCUPIED &&
    uniqueOccupier !== CONTESTED &&
    tower.allegiance !== uniqueOccupier
  ) {
    tower.allegiance = uniqueOccupier;
  }

  tower.secondsUntilNextSoldier -= elapsedTimeInSeconds;
  if (tower.secondsUntilNextSoldier <= 0 && tower.pendingUnits.length > 0) {
    const pendingUnit = tower.pendingUnits[0];
    const assemblingUnit = battle.getUnit(pendingUnit.unitId);
    const plannedSoldier = pendingUnit.soldiers.shift()!;
    const soldier: Soldier = {
      position: plannedSoldier.position,
      animation: { kind: SoldierAnimationKind.Idle, timeInSeconds: 0 },
      attackTargetId: null,
      health: 100,
      orientation: { yaw: plannedSoldier.yRot, pitch: 0, roll: 0 },
      assemblyPoint: plannedSoldier.assemblyPoint,
    };
    geoUtils.setTriple(soldier.position, tower.position);
    const soldierId = battle.addEntity(soldier);
    assemblingUnit.soldierIds.push(soldierId);
    // scene.add(soldier.gltf.scene);
    if (pendingUnit.soldiers.length === 0) {
      assemblingUnit.areSoldiersStillBeingAdded = false;
      tower.pendingUnits.shift();
    }
    tower.secondsUntilNextSoldier = SOLDIER_DEPLOYMENT_DELAY_SECONDS;
  }
}

function tickSoldierExplosions(
  elapsedTimeInSeconds: number,
  resources: Resources
): void {
  const { soldierExplosionClipDuration } = resources.assets.mcon;
  const { battle } = resources;
  const { soldierExplosions } = battle.data;
  for (let i = 0; i < soldierExplosions.length; ++i) {
    const explosion = soldierExplosions[i];
    explosion.timeInSeconds += elapsedTimeInSeconds;

    if (explosion.timeInSeconds > soldierExplosionClipDuration) {
      soldierExplosions.splice(i, 1);
      continue;
    }
  }
}

function inTowerTerritory(
  possibleOccupierPosition: Triple,
  towerPosition: Triple
): boolean {
  const localX = possibleOccupierPosition[0] - towerPosition[0];
  const localZ = possibleOccupierPosition[2] - towerPosition[2];
  return (
    possibleOccupierPosition[1] < 1 &&
    -10 <= localX &&
    localX <= 10 &&
    -10 <= localZ &&
    localZ <= 10
  );
}

function applyKingSlashDamage(
  allegiance: Allegiance,
  battle: BattleState
): void {
  const king =
    allegiance === Allegiance.Azuki
      ? battle.getAzukiKing()
      : battle.getEdamameKing();
  const { orientation, position } = king;
  const slashRangeSquared = 6 ** 2;
  for (const unitId of battle.data.activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === allegiance) {
      continue;
    }

    for (const soldierId of unit.soldierIds) {
      const soldier = battle.getSoldier(soldierId);
      const differenceSquared = geoUtils.distanceToSquared(
        soldier.position,
        position
      );

      const angleDifference = normalizeAngleBetweenNegPiAndPosPi(
        orientation.yaw -
          Math.atan2(
            soldier.position[0] - position[0],
            soldier.position[2] - position[2]
          ) +
          Math.PI
      );
      if (
        !(
          differenceSquared <= slashRangeSquared &&
          Math.abs(angleDifference) <= Math.PI * 0.2
        )
      ) {
        continue;
      }

      soldier.health -= SLASH_DAMAGE;
    }
  }
}

function normalizeAngleBetweenNegPiAndPosPi(angle: number): number {
  let out = angle;
  while (out < Math.PI) {
    out += Math.PI * 2;
  }
  while (out > Math.PI) {
    out -= Math.PI * 2;
  }
  return out;
}

function getSoldierExplosion(
  allegiance: Allegiance,
  position: Triple,
  orientation: Orientation
): SoldierExplosion {
  return {
    allegiance,
    position: [position[0], position[1], position[2]],
    orientation,
    timeInSeconds: 0,
  };
}

export function updatePlannedDeploymentAfterUpdatingCamera(
  resources: Resources
): void {
  deployPlannedUnitIfItExistsAndCorrectKeyPressed(resources);

  const { battle, san } = resources;
  const groundCursorPosition = getGroundCursorPosition(san);
  if (groundCursorPosition === null) {
    return;
  }

  const { plannedDeployment } = battle.data;

  if (plannedDeployment.start === null) {
    return;
  }

  const temp_fromStartToCursor = groundCursorPosition
    .clone()
    .sub(geoUtils.toThreeVec(plannedDeployment.start));
  const fromStartToCursorLength = temp_fromStartToCursor.length();
  const RANK_GAP = 8;
  const width = Math.max(1, Math.floor(fromStartToCursorLength / RANK_GAP));
  plannedDeployment.plannedUnit = getPlannedUnit({
    start: plannedDeployment.start,
    forward: geoUtils.fromThreeVec(
      temp_fromStartToCursor
        .clone()
        .normalize()
        .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2)
    ),
    dimensions: [width, 1],
    gap: [8, 8 * (Math.sqrt(3) / 2)],
    allegiance: Allegiance.Azuki,
  });
}

function deployPlannedUnitIfItExistsAndCorrectKeyPressed(
  resources: Resources
): void {
  const { keys, battle } = resources;
  const { plannedDeployment } = resources.battle.data;
  const selectedTowerId = getAzukiBannerTowerIdNearestGroundCursor(resources);
  if (
    plannedDeployment.plannedUnit !== null &&
    keys.d &&
    selectedTowerId !== null &&
    plannedDeployment.start === null
  ) {
    const selectedTower = battle.getBannerTower(selectedTowerId);

    const assemblingUnit: Unit = {
      order: { kind: UnitOrderKind.Assemble },
      soldierIds: [],
      forward: plannedDeployment.plannedUnit.forward,
      isPreview: false,
      allegiance: plannedDeployment.plannedUnit.allegiance,
      areSoldiersStillBeingAdded: true,
    };
    const assemblingUnitId = battle.addEntity(assemblingUnit);
    selectedTower.pendingUnits.push({
      unitId: assemblingUnitId,
      soldiers: plannedDeployment.plannedUnit.soldiers,
    });
    battle.data.activeUnitIds.push(assemblingUnitId);

    plannedDeployment.plannedUnit = null;
  }
}

function getAzukiBannerTowerIdNearestGroundCursor(
  resources: Resources
): null | Ref {
  const groundCursorPosition = getGroundCursorPosition(resources.san);
  if (groundCursorPosition === null) {
    return null;
  }
  return getNearestBannerTowerId(
    geoUtils.fromThreeVec(groundCursorPosition),
    resources.battle,
    isAzukiBannerTower
  );
}

function getPlannedUnit({
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
}): PlannedUnit {
  const rightStep = geoUtils
    .toThreeVec(forward)
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    .multiplyScalar(rightGap);
  const backStep = geoUtils
    .toThreeVec(forward)
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
    .multiplyScalar(backGap);
  const soldiers: PlannedSoldier[] = [];
  for (let right = 0; right < width; ++right) {
    for (let back = 0; back < height; ++back) {
      const soldierPosition = geoUtils
        .toThreeVec(start)
        .clone()
        .add(rightStep.clone().multiplyScalar(right + 0.5 * (back & 1)))
        .add(backStep.clone().multiplyScalar(back));
      const soldier = getPlannedSoldier(
        soldierPosition.x,
        soldierPosition.y,
        soldierPosition.z
      );
      soldier.yRot = Math.atan2(forward[0], forward[2]);
      soldiers.push(soldier);
    }
  }

  return {
    order: { kind: UnitOrderKind.Advance },
    soldiers,
    forward,
    allegiance,
  };
}

function getPlannedSoldier(x: number, y: number, z: number): PlannedSoldier {
  return {
    position: [x, y, z],
    health: 100,
    yRot: 0,
    assemblyPoint: [x, y, z],
  };
}

function getNearestRestingDragonflyId(
  position: Triple,
  battle: BattleState
): null | Ref {
  let nearestDragonflyId: Ref | null = null;
  let nearestDistanceSquared = Infinity;
  for (const dragonflyId of battle.data.activeDragonflyIds) {
    const dragonfly = battle.getDragonfly(dragonflyId);
    if (dragonfly.flightState.kind !== DragonflyFlightKind.Resting) {
      continue;
    }

    const distSq = geoUtils.distanceToSquared(position, dragonfly.position);
    if (distSq < nearestDistanceSquared) {
      nearestDragonflyId = dragonflyId;
      nearestDistanceSquared = distSq;
    }
  }

  return nearestDragonflyId;
}

function getCollidingBannerTower(
  position: Triple,
  battle: BattleState
): null | Ref {
  for (const towerId of battle.data.activeTowerIds) {
    const tower = battle.getBannerTower(towerId);
    if (isCollidingWithTower(position, tower.position)) {
      return towerId;
    }
  }

  return null;
}

function isCollidingWithTower(
  possibleOccupierPosition: Triple,
  towerPosition: Triple
): boolean {
  const localX = possibleOccupierPosition[0] - towerPosition[0];
  const localY = possibleOccupierPosition[1] - towerPosition[1];
  const localZ = possibleOccupierPosition[2] - towerPosition[2];
  const collidesWithBigHitbox =
    -10 <= localX &&
    localX <= 10 &&
    0 <= localY &&
    localY <= 30 &&
    -10 <= localZ &&
    localZ <= 10;

  if (collidesWithBigHitbox) {
    const isInGap =
      ((-5 <= localX && localX <= 5) || (-5 <= localZ && localZ <= 5)) &&
      0 <= localY &&
      localY <= 15;
    return !isInGap;
  }
  return false;
}

function tickKingBoundaries(resources: Resources): void {
  const { battle } = resources;

  if (!isAzukiKingInBannerTowerSafezone(battle)) {
    const azukiKing = battle.getAzukiKing();
    azukiKing.health -=
      KING_OUT_OF_SAFEZONE_DAMAGE_PER_SECOND * MILLISECS_PER_TICK * 1e-3;
    console.log("azuki king health: ", azukiKing.health);
  }

  if (!isEdamameKingInBannerTowerSafezone(battle)) {
    const edamameKing = battle.getEdamameKing();
    edamameKing.health -=
      KING_OUT_OF_SAFEZONE_DAMAGE_PER_SECOND * MILLISECS_PER_TICK * 1e-3;
  }
}

function isAzukiKingInBannerTowerSafezone(battle: BattleState): boolean {
  return (
    getAzukiKingDistanceSquaredToNearestBannerTower(battle) <=
    BANNERTOWER_SAFEZONE_RANGE_SQUARED
  );
}

/** Returns infinity if there are no azuki banner towers. */
export function getAzukiKingDistanceSquaredToNearestBannerTower(
  battle: BattleState
): number {
  const azukiKing = battle.getAzukiKing();

  const nearestAzukiTowerId = getNearestBannerTowerId(
    azukiKing.position,
    battle,
    isAzukiBannerTower
  );
  if (nearestAzukiTowerId === null) {
    return Infinity;
  }
  return geoUtils.xzDistanceToSquared(
    azukiKing.position,
    battle.getBannerTower(nearestAzukiTowerId).position
  );
}

export function isAzukiBannerTower(tower: BannerTower): boolean {
  return tower.allegiance === Allegiance.Azuki;
}

function isEdamameKingInBannerTowerSafezone(battle: BattleState): boolean {
  return (
    getEdamameKingDistanceSquaredToNearestBannerTower(battle) <=
    BANNERTOWER_SAFEZONE_RANGE_SQUARED
  );
}

export function getEdamameKingDistanceSquaredToNearestBannerTower(
  battle: BattleState
): number {
  const edamameKing = battle.getEdamameKing();

  const nearestEdamameTowerId = getNearestBannerTowerId(
    edamameKing.position,
    battle,
    isEdamameBannerTower
  );
  if (nearestEdamameTowerId === null) {
    return Infinity;
  }
  return geoUtils.xzDistanceToSquared(
    edamameKing.position,
    battle.getBannerTower(nearestEdamameTowerId).position
  );
}

function isEdamameBannerTower(tower: BannerTower): boolean {
  return tower.allegiance === Allegiance.Edamame;
}

export function getNearestBannerTowerId(
  position: Triple,
  battle: BattleState,
  predicate: (tower: BannerTower) => boolean
): null | Ref {
  let nearestTowerId: Ref | null = null;
  let nearestDistanceSquared = Infinity;
  for (const towerId of battle.data.activeTowerIds) {
    const tower = battle.getBannerTower(towerId);
    if (!predicate(tower)) {
      continue;
    }

    const distSq = geoUtils.distanceToSquared(position, tower.position);
    if (distSq < nearestDistanceSquared) {
      nearestTowerId = towerId;
      nearestDistanceSquared = distSq;
    }
  }

  return nearestTowerId;
}
