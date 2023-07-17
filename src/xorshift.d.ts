declare module "xorshift" {
  declare class Xorshift {
    constructor(seed: [number, number, number, number]);

    /**
     * Returns a number in `[0, 1)`.
     */
    random(): number;
  }

  declare const export_: Xorshift & { constructor: typeof Xorshift };

  export default export_;
}
