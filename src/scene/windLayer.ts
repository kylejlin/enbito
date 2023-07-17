import { Color } from "three";
import { WindLayer } from "../WindLayer";

export function getWindLayer(): WindLayer {
  return new WindLayer({
    mode: "multiply",
    colorA: new Color(0xffffff),
    colorB: new Color(0xacf5ce),
    noiseScale: 10,
    noiseStrength: 5,
    length: 1.2,
    sway: 0.5,
  });
}
