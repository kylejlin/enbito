import { Assets } from "./assets";
import { BattleState } from "./battleState";
import { San } from "./san";

export interface Resources {
  assets: Assets;

  mouse: MouseState;
  keys: KeySet;

  battle: BattleState;

  san: San;

  secondsUntilNextBattleStateSave: number;
}

export interface MouseState {
  /** Left edge is 0, right edge is 1. */
  x: number;
  /** Top edge is 0, bottom edge is 1. */
  y: number;
  isLocked: boolean;
}

export interface KeySet {
  w: boolean;
  f: boolean;
  t: boolean;
  g: boolean;
  r: boolean;
  v: boolean;
  d: boolean;
  s: boolean;
  space: boolean;
  _1: boolean;
}
