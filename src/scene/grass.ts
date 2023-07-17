import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { Depth, LayerMaterial } from "lamina/vanilla";
import {
  ConeGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Vector3,
  Object3D,
  MathUtils,
  Color,
  Mesh,
} from "three";

import Perlin from "perlin.js";
import xorshift from "xorshift";
import { WindLayer } from "../WindLayer";

export function getGrass(mesh: Mesh, windLayer: WindLayer): InstancedMesh {
  Perlin.seed(1234);
  const prng = new xorshift.constructor([1, 2, 3, 4]);
  prng.random = prng.random.bind(prng);

  const STRAND_COUNT = 10000;
  const strandGeometry = new ConeGeometry(0.05, 1.0, 2, 20, false, 0, Math.PI);

  // @ts-ignore
  const strandLayer = new LayerMaterial({
    side: DoubleSide,
    lighting: "physical",
    envMapIntensity: 1,
    // @ts-ignore
    layers: [
      // @ts-ignore
      new Depth({
        colorA: new Color(0x221600),
        colorB: new Color(0xade266),
        near: 0.14,
        far: 1.52,
        mapping: "world",
      }),
      windLayer,
    ],
  });
  const strands = new InstancedMesh(strandGeometry, strandLayer, STRAND_COUNT);

  strands.geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
  strands.geometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, 0.5));

  const sampler = new MeshSurfaceSampler(mesh).build();
  // This is a hack, since THREE does not
  // provide an official way to set the random function
  // of `MeshSurfaceSampler`.
  (sampler as any).randomFunction = prng.random;

  const position = new Vector3();
  const normal = new Vector3();
  const matrix = new Matrix4();
  const dummy = new Object3D();
  for (let i = 0; i < STRAND_COUNT; ++i) {
    sampler.sample(position, normal);
    const p = position.clone().multiplyScalar(5);
    const n = Perlin.simplex3(...p.toArray());
    dummy.scale.setScalar(MathUtils.mapLinear(n, -1, 1, 0.3, 1) * 0.1);
    dummy.position.copy(position);
    dummy.lookAt(normal.add(position));
    dummy.rotation.y += prng.random() - 0.5 * (Math.PI * 0.5);
    dummy.rotation.z += prng.random() - 0.5 * (Math.PI * 0.5);
    dummy.rotation.x += prng.random() - 0.5 * (Math.PI * 0.5);
    dummy.updateMatrix();

    matrix.makeTranslation(position.x, position.y, position.z);

    strands.setMatrixAt(i, dummy.matrix);
  }

  return strands;
}
