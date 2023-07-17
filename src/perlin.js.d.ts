declare module "perlin.js" {
  export default class Perlin {
    static simplex2(x: number, y: number): number;

    static simplex3(x: number, y: number, z: number): number;

    static perlin2(x: number, y: number): number;

    static perlin3(x: number, y: number, z: number): number;

    /**
     * Seed the noise functions. Only 65536 different seeds are supported. Use a float between 0 and 1 or an integer from 1 to 65536.
     */
    static seed(val: number): void;
  }
}
