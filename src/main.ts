import { Assets } from "./assets";
import { AmbientLight } from "three";

import { San, getDefaultSanData } from "./san";
import { BattleState } from "./battleState";
import { getDefaultBattleState } from "./getBattleState";
import * as geoUtils from "./geoUtils";
import { updateThreeScene } from "./updateThreeScene";
import { getGroundCursorPosition } from "./groundCursor";
import { KeySet, MouseState, Resources } from "./resourceBundle";
import {
  deployPlannedUnitIfItExistsAndDeployKeyPressedAssumingCameraHasBeenUpdated,
  getPlannedDeploymentUnitBasedOnPlannedDeploymentStart,
  getTentativeWheelInfo,
  getTentativelySelectedAzukiUnitId,
  tick,
} from "./tick";
import { MILLISECS_PER_TICK } from "./gameConsts";
import {
  Allegiance,
  BattleStateData,
  Orientation,
  PendingCommandKind,
  PlannedDeploymentKind,
  SparseArray,
  Triple,
  UnitOrderKind,
} from "./battleStateData";

const BATTLE_STATE_SAVE_PERIOD_IN_SECONDS = 1;
const LOCAL_STORAGE_BATTLE_DATA_KEY = "enbito.battle_data";

let isAboutToReloadPage = false;

export function main(assets: Assets): void {
  const san = new San(getDefaultSanData(assets));

  let worldTime = Date.now();
  let lastWorldTime = worldTime;

  const mouse: MouseState = { x: 0.5, y: 0.5, isLocked: false };
  document.addEventListener("pointerlockchange", () => {
    mouse.isLocked = !!document.pointerLockElement;
  });
  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  window.addEventListener("mousemove", (e) => {
    if (mouse.isLocked) {
      mouse.x += e.movementX / window.innerWidth;
      mouse.y += e.movementY / window.innerHeight;

      if (mouse.y < 0) {
        mouse.y = 0;
      }
      if (mouse.y > 1) {
        mouse.y = 1;
      }

      if (resources.battle.getAzukiKing().dragonflyId !== null) {
        if (mouse.x < 0) {
          mouse.x = 0;
        }
        if (mouse.x > 1) {
          mouse.x = 1;
        }
      }
    }
  });

  const keys: KeySet = {
    w: false,
    f: false,
    t: false,
    g: false,
    r: false,
    v: false,
    d: false,
    s: false,
    a: false,
    space: false,
    _1: false,
    _0: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
    if (e.key === "f") {
      const wasKeyDown = keys.f;
      keys.f = true;
      if (!wasKeyDown) {
        handleSoldierSetKeyPress();
      }
    }
    if (e.key === "t") {
      keys.t = true;
    }
    if (e.key === "g") {
      keys.g = true;
    }
    if (e.key === "r") {
      keys.r = true;
    }
    if (e.key === "v") {
      keys.v = true;
    }
    if (e.key === "d") {
      keys.d = true;
    }
    if (e.key === "s") {
      const wasKeyDown = keys.s;
      keys.s = true;
      if (!wasKeyDown) {
        handleSoldierSelectionKeyPress();
      }
    }
    if (e.key === "a") {
      const wasKeyDown = keys.a;
      keys.a = true;
      if (!wasKeyDown) {
        handleDeselectAllKeyPress(resources);
      }
    }
    if (e.key === " ") {
      keys.space = true;
    }
    if (e.key === "1") {
      const wasKeyDown = keys._1;
      keys._1 = true;
      if (!wasKeyDown) {
        handleWheelCommandKeyPress(resources);
      }
    }
    if (e.key === "0") {
      const wasKeyDown = keys._0;
      keys._0 = true;
      if (!wasKeyDown) {
        resources.battle.data.pendingCommand = {
          kind: PendingCommandKind.None,
        };
      }
    }

    if (e.key === "{") {
      isAboutToReloadPage = true;
      localStorage.removeItem(LOCAL_STORAGE_BATTLE_DATA_KEY);
      window.location.reload();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
    if (e.key === "f") {
      keys.f = false;
    }
    if (e.key === "t") {
      keys.t = false;
    }
    if (e.key === "g") {
      keys.g = false;
    }
    if (e.key === "r") {
      keys.r = false;
    }
    if (e.key === "v") {
      keys.v = false;
    }
    if (e.key === "d") {
      keys.d = false;
    }
    if (e.key === "s") {
      keys.s = false;
    }
    if (e.key === "a") {
      keys.a = false;
    }
    if (e.key === " ") {
      keys.space = false;
    }
    if (e.key === "1") {
      keys._1 = false;
    }
    if (e.key === "0") {
      keys._0 = false;
    }
  });

  san.data.renderer.setSize(window.innerWidth, window.innerHeight);
  resizeCameraAndRerender();
  window.addEventListener("resize", resizeCameraAndRerender);

  document.body.appendChild(san.data.renderer.domElement);

  san.data.scene.add(new AmbientLight(0x888888, 10));

  const resources: Resources = {
    battle: loadBattleStateOrFallBackToDefault(),
    san,
    mouse,
    keys,
    assets,
    secondsUntilNextBattleStateSave: BATTLE_STATE_SAVE_PERIOD_IN_SECONDS,
  };

  const azukiKing = resources.battle.getAzukiKing();

  addEnvironment();

  onAnimationFrame();

  function resizeCameraAndRerender(): void {
    const { camera, renderer } = san.data;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  function render(): void {
    const { renderer, scene, camera } = san.data;
    renderer.render(scene, camera);
  }

  function onAnimationFrame(): void {
    const now = Date.now();
    worldTime = now;

    oncePerFrameBeforeTicks();

    while (lastWorldTime + MILLISECS_PER_TICK <= worldTime) {
      tick(resources);
      lastWorldTime += MILLISECS_PER_TICK;
      resources.secondsUntilNextBattleStateSave -= MILLISECS_PER_TICK * 1e-3;
    }

    updateThreeScene(resources.battle, resources.san);

    deployPlannedUnitIfItExistsAndDeployKeyPressedAssumingCameraHasBeenUpdated(
      resources
    );

    render();

    requestAnimationFrame(onAnimationFrame);

    if (
      resources.secondsUntilNextBattleStateSave <= 0 &&
      !isAboutToReloadPage
    ) {
      saveBattleData(resources.battle.data);
      while (resources.secondsUntilNextBattleStateSave <= 0) {
        resources.secondsUntilNextBattleStateSave +=
          BATTLE_STATE_SAVE_PERIOD_IN_SECONDS;
      }
    }
  }

  function oncePerFrameBeforeTicks(): void {
    if (azukiKing.dragonflyId !== null) {
      // TODO
    } else {
      azukiKing.cameraPitch = -(mouse.y - 0.5) * Math.PI;
      azukiKing.orientation.yaw = -(mouse.x - 0.5) * Math.PI * 2;
    }
  }

  function addEnvironment(): void {
    san.data.scene.environment = assets.environment;
  }

  function handleSoldierSetKeyPress(): void {
    const { pendingCommand } = resources.battle.data;
    if (pendingCommand.kind === PendingCommandKind.None) {
      trySetDeploymentStart();
    } else if (
      pendingCommand.kind === PendingCommandKind.Deploy &&
      pendingCommand.plannedDeployment.kind === PlannedDeploymentKind.WithStart
    ) {
      trySetDeploymentEnd();
    }
  }

  function trySetDeploymentStart(): void {
    const groundCursorPosition = getGroundCursorPosition(resources.san);
    if (groundCursorPosition === null) {
      return;
    }

    const { pendingCommand } = resources.battle.data;
    if (pendingCommand.kind === PendingCommandKind.None) {
      resources.battle.data.pendingCommand = {
        kind: PendingCommandKind.Deploy,
        plannedDeployment: {
          kind: PlannedDeploymentKind.WithStart,
          start: geoUtils.fromThreeVec(groundCursorPosition),
        },
      };
      return;
    }
  }

  function trySetDeploymentEnd(): void {
    const { pendingCommand } = resources.battle.data;
    if (pendingCommand.kind !== PendingCommandKind.Deploy) {
      return;
    }

    const plannedUnit = getPlannedDeploymentUnitBasedOnPlannedDeploymentStart(
      resources.battle,
      san
    );
    if (plannedUnit === null) {
      return;
    }

    pendingCommand.plannedDeployment = {
      kind: PlannedDeploymentKind.WithPlannedUnit,
      plannedUnit,
    };
  }

  function handleSoldierSelectionKeyPress(): void {
    const { pendingCommand } = resources.battle.data;
    if (pendingCommand.kind === PendingCommandKind.SelectUnit) {
      toggleSelectionOfAzukiUnitNearestGroundCursor();
      resources.battle.data.pendingCommand = { kind: PendingCommandKind.None };
    } else if (pendingCommand.kind === PendingCommandKind.None) {
      resources.battle.data.pendingCommand = {
        kind: PendingCommandKind.SelectUnit,
      };
    }
  }

  function toggleSelectionOfAzukiUnitNearestGroundCursor(): void {
    const { battle } = resources;
    const tentativelySelectedUnitId = getTentativelySelectedAzukiUnitId(
      battle,
      san
    );
    if (tentativelySelectedUnitId === null) {
      return;
    }

    const unit = battle.getUnit(tentativelySelectedUnitId);
    unit.isSelected = !unit.isSelected;
  }
}

function loadBattleStateOrFallBackToDefault(): BattleState {
  const s = localStorage.getItem(LOCAL_STORAGE_BATTLE_DATA_KEY);

  if (s !== null) {
    try {
      const data = JSON.parse(s);
      return new BattleState(data);
    } catch {}
  }

  return new BattleState(getDefaultBattleState());
}

function saveBattleData(data: BattleStateData): void {
  const s = JSON.stringify(data);
  localStorage.setItem(LOCAL_STORAGE_BATTLE_DATA_KEY, s);
}

function handleWheelCommandKeyPress(resources: Resources): void {
  const groundCursorPosition = getGroundCursorPosition(resources.san);
  if (groundCursorPosition === null) {
    return;
  }

  const { battle, san } = resources;
  const { pendingCommand } = battle.data;
  if (pendingCommand.kind === PendingCommandKind.None) {
    const selectedAzukiUnitIds = battle.data.activeUnitIds.filter((id) => {
      const unit = battle.getUnit(id);
      return unit.allegiance === Allegiance.Azuki && unit.isSelected;
    });
    if (selectedAzukiUnitIds.length === 0) {
      return;
    }

    const originalSoldierTransforms: SparseArray<[Triple, Orientation]> = {};
    for (const unitId of selectedAzukiUnitIds) {
      const unit = battle.getUnit(unitId);
      for (const soldierId of unit.soldierIds) {
        const soldier = battle.getSoldier(soldierId);
        originalSoldierTransforms[soldierId.value] = [
          geoUtils.cloneTriple(soldier.position),
          geoUtils.cloneOrientation(soldier.orientation),
        ];
      }
    }

    resources.battle.data.pendingCommand = {
      kind: PendingCommandKind.Wheel,
      originalSoldierTransforms,
      originalGroundCursorPosition: geoUtils.fromThreeVec(groundCursorPosition),
    };
  } else if (pendingCommand.kind === PendingCommandKind.Wheel) {
    const wheelInfo = getTentativeWheelInfo(battle, san);
    if (wheelInfo === null) {
      return;
    }

    const { activeUnitIds } = battle.data;
    for (const unitId of activeUnitIds) {
      const unit = battle.getUnit(unitId);
      if (!(unit.allegiance === Allegiance.Azuki && unit.isSelected)) {
        continue;
      }

      const soldierDestPositions: SparseArray<Triple> = {};
      for (const soldierId of unit.soldierIds) {
        soldierDestPositions[soldierId.value] =
          wheelInfo.soldierTransforms[soldierId.value][0];
      }

      unit.order = {
        kind: UnitOrderKind.Wheel,
        destYaw: unit.yaw + wheelInfo.deltaYaw,
        soldierDestPositions,
      };
    }

    resources.battle.data.pendingCommand = { kind: PendingCommandKind.None };
  }
}

function handleDeselectAllKeyPress(resources: Resources): void {
  const { battle } = resources;
  const { pendingCommand, activeUnitIds } = battle.data;

  if (pendingCommand.kind !== PendingCommandKind.None) {
    return;
  }

  for (const unitId of activeUnitIds) {
    const unit = battle.getUnit(unitId);
    if (unit.allegiance === Allegiance.Azuki) {
      unit.isSelected = false;
    }
  }
}
