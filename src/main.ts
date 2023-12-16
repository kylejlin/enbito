import { Assets } from "./assets";
import { AmbientLight } from "three";

import { San, getDefaultSanData } from "./san";
import { BattleState } from "./battleState";
import { getDefaultBattleState } from "./getBattleState";
import * as geoUtils from "./geoUtils";
import { updateThreeSceneAfterTicking } from "./updateThreeScene/updateThreeSceneAfterTicking";
import { updateThreeSceneAfterPlannedDeployment } from "./updateThreeScene/updateThreeSceneAfterPlannedDeployment";
import { resetThreeScene } from "./updateThreeScene/resetThreeScene";
import { addInstancedMeshesToSceneAndFlagForUpdate } from "./updateThreeScene/addInstancedMeshesToSceneAndFlagForUpdate";
import { getGroundCursorPosition } from "./groundCursor";
import { KeySet, MouseState, Resources } from "./resourceBundle";
import { tick, updatePlannedDeploymentAfterUpdatingCamera } from "./tick";
import { MILLISECS_PER_TICK } from "./gameConsts";
import { BattleStateData } from "./battleStateData";

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
    space: false,
    _1: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
    if (e.key === "f") {
      const wasKeyDown = keys._1;
      keys.f = true;
      if (!wasKeyDown) {
        handleFKeyPress();
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
    if (e.key === " ") {
      keys.space = true;
    }
    if (e.key === "1") {
      keys._1 = true;
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
    if (e.key === " ") {
      keys.space = false;
    }
    if (e.key === "1") {
      keys._1 = false;
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

    resetThreeScene(resources.san);

    updateThreeSceneAfterTicking(resources.battle, resources.san);

    updatePlannedDeploymentAfterUpdatingCamera(resources);

    updateThreeSceneAfterPlannedDeployment(resources.battle, resources.san);

    addInstancedMeshesToSceneAndFlagForUpdate(resources.san);

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

  function handleFKeyPress(): void {
    if (resources.battle.data.plannedDeployment.start === null) {
      trySetDeploymentStart();
    } else {
      trySetDeploymentEnd();
    }
  }

  function trySetDeploymentStart(): void {
    const groundCursorPosition = getGroundCursorPosition(resources.san);
    if (groundCursorPosition === null) {
      return;
    }

    if (resources.battle.data.plannedDeployment.plannedUnit === null) {
      resources.battle.data.plannedDeployment.start =
        geoUtils.fromThreeVec(groundCursorPosition);
    } else {
      // TODO: For now, this is a no-op.
      // In the future, it might control the number of ranks of the legion.
    }
  }

  function trySetDeploymentEnd(): void {
    resources.battle.data.plannedDeployment.start = null;
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
