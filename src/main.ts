import { Assets } from "./assets";
import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Quaternion,
  Vector3,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  MathUtils,
  ACESFilmicToneMapping,
  WebGLCubeRenderTarget,
  HalfFloatType,
  CubeCamera,
  PlaneGeometry,
  AnimationMixer,
  AnimationClip,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
} from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RepeatWrapping } from "three";
import Perlin from "perlin.js";

export function main(assets: Assets): void {
  const mousePos = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mousePos.x = e.clientX / window.innerWidth;
    mousePos.y = e.clientY / window.innerHeight;
  });

  const keys = {
    w: false,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "w") {
      keys.w = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
      keys.w = false;
    }
  });

  let lastTime = Date.now();

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    114,
    window.innerWidth / window.innerHeight
  );

  const renderer = new WebGLRenderer();
  renderer.useLegacyLights = false;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeCameraAndRerender();
  window.addEventListener("resize", resizeCameraAndRerender);

  document.body.appendChild(renderer.domElement);

  const cameraQuat = new Quaternion();
  cameraQuat.setFromAxisAngle(new Vector3(1, 0, 0), (3 * Math.PI) / 2);
  camera.setRotationFromQuaternion(cameraQuat);

  camera.position.set(0, 2, 0);

  const texture = assets.grass.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const grasslikeSize = 100000;
  texture.repeat.set(grasslikeSize, grasslikeSize);
  const grasslike = new Mesh(
    new PlaneGeometry(grasslikeSize, grasslikeSize),
    new MeshBasicMaterial({ map: texture })
  );
  grasslike.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  grasslike.position.set(-1, 0, -1);
  scene.add(grasslike);

  const yMarker = new Mesh(
    new BoxGeometry(),
    new MeshBasicMaterial({ color: 0x0088bb })
  );
  yMarker.position.set(0, 5, 0);
  scene.add(yMarker);

  const cubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeRenderTarget.texture.type = HalfFloatType;

  const cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  const player = assets.azuki.scene;
  player.position.set(0, 0, 0);
  const playerWalkClip = AnimationClip.findByName(
    assets.azuki.animations,
    "Walk"
  );

  const playerMixer = new AnimationMixer(player);
  const playerWalkAction = playerMixer.clipAction(playerWalkClip);
  playerWalkAction.play();

  const world = getUninitializedWorld(123);
  renderChunkIfMissing(world, 0, 0);
  addWorldToScene(world, scene);

  addSky();
  addEnvironment();
  scene.add(player);

  tick();

  function resizeCameraAndRerender(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  function addSky(): void {
    // Based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_sky.html
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const sun = new Vector3();

    const effectController = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
      exposure: renderer.toneMappingExposure,
    };

    function onControllerChange() {
      const uniforms = sky.material.uniforms;
      uniforms["turbidity"].value = effectController.turbidity;
      uniforms["rayleigh"].value = effectController.rayleigh;
      uniforms["mieCoefficient"].value = effectController.mieCoefficient;
      uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

      const phi = MathUtils.degToRad(90 - effectController.elevation);
      const theta = MathUtils.degToRad(effectController.azimuth);

      sun.setFromSphericalCoords(1, phi, theta);

      uniforms["sunPosition"].value.copy(sun);

      renderer.toneMappingExposure = effectController.exposure;
      renderer.render(scene, camera);
    }

    onControllerChange();
  }

  function tick(): void {
    const now = Date.now();
    const elapsedTime = now - lastTime;
    lastTime = now;
    cubeCamera.update(renderer, scene);
    render();

    player.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0);
    player.rotateY(-(mousePos.x - 0.5) * Math.PI * 2);

    if (keys.w) {
      playerWalkAction.play();
      player.translateZ((3 * -elapsedTime) / 1000);
    } else {
      playerWalkAction.stop();
    }

    playerMixer.update((2 * elapsedTime) / 1000);

    camera.position.copy(player.position);
    camera.quaternion.copy(player.quaternion);
    camera.translateY(5);
    camera.translateZ(2);
    camera.rotateX(-(mousePos.y - 0.5) * Math.PI);

    requestAnimationFrame(tick);
  }

  function addEnvironment(): void {
    scene.environment = assets.environment;
  }
}

interface World {
  seed: number;
  chunks: { [key: string]: Chunk };
  blockMeshes: BlockMeshDict;
}

type BlockMeshDict = { [key in BlockType]: Mesh };

interface Chunk {
  blocks: Uint16Array;
}

function getUninitializedWorld(seed: number): World {
  return { seed, chunks: {}, blockMeshes: getBlockMeshes() };
}

const BLOCK_SIZE = 2;

function getBlockMeshes(): BlockMeshDict {
  return {
    // Don't care. We never render the `Blank` mesh.
    [BlockTypes.Blank]: new Mesh(
      new BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
      new MeshStandardMaterial({ color: 0xff0000 })
    ),

    [BlockTypes.Dirt]: new Mesh(
      new BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
      new MeshStandardMaterial({ color: 0x00ff00 })
    ),
  };
}

function renderChunkIfMissing(world: World, x: number, z: number): void {
  const k = getCoordString(x, z);
  if (world.chunks[k]) {
    return;
  }

  world.chunks[k] = generateChunk(world.seed, x, z);
}

const CHUNK_WIDTH = 16;
const CHUNK_HEIGHT = 256;

const BlockTypes = {
  Blank: 0,
  Dirt: 1,
} as const;
type BlockType = (typeof BlockTypes)[keyof typeof BlockTypes];

function generateChunk(seed: number, chunkX: number, chunkZ: number): Chunk {
  const blocks = new Uint16Array(CHUNK_WIDTH * CHUNK_WIDTH * CHUNK_HEIGHT);
  blocks.fill(BlockTypes.Blank);

  // TODO: Implement real chunk generation.
  // This is just a placeholder.
  for (let i = 0; i < blocks.length; ++i) {
    const [localX, localY, localZ] = getBlockCoordsFromBlockIndex(i);
    if (localY > 10) {
      blocks[i] = BlockTypes.Dirt;
    }
  }

  return { blocks };
}

function getCoordString(x: number, z: number): string {
  return `${x},${z}`;
}

function addWorldToScene(world: World, scene: Scene): void {
  for (const k in world.chunks) {
    const [x, z] = parseCoordString(k);
    addChunkToScene(world.chunks[k], x, z, scene, world.blockMeshes);
  }
}

function parseCoordString(coordString: string): [number, number] {
  const [x, z] = coordString.split(",").map((s) => Number.parseInt(s, 10));

  if (Number.isNaN(x) || Number.isNaN(z)) {
    throw new Error(`Invalid coord string: ${coordString}`);
  }

  return [x, z];
}

function addChunkToScene(
  chunk: Chunk,
  chunkX: number,
  chunkZ: number,
  scene: Scene,
  dict: BlockMeshDict
): void {
  const factoryDict = getEmptyBlockInstancedMeshFactoryDict();
  for (let i = 0; i < chunk.blocks.length; ++i) {
    const [localX, localY, localZ] = getBlockCoordsFromBlockIndex(i);
    const blockType = chunk.blocks[i] as BlockType;
    const factory = factoryDict[blockType];
    factory.localCoords.push(localX, localY, localZ);
  }
  addPendingBlocksToScene(factoryDict, chunkX, chunkZ, scene, dict);
}

type BlockInstancedMeshFactoryDict = {
  [key in BlockType]: BlockInstancedMeshFactory;
};

interface BlockInstancedMeshFactory {
  localCoords: number[];
}

function getEmptyBlockInstancedMeshFactoryDict(): BlockInstancedMeshFactoryDict {
  return {
    [BlockTypes.Blank]: { localCoords: [] },
    [BlockTypes.Dirt]: { localCoords: [] },
  };
}

/**
 * The input must be a non-negative integer.
 * The output will be a tuple of non-negative integers.
 */
function getBlockCoordsFromBlockIndex(index: number): [number, number, number] {
  const x = index % CHUNK_WIDTH;
  const z = Math.floor((index % (CHUNK_WIDTH * CHUNK_WIDTH)) / CHUNK_WIDTH);
  const y = Math.floor(index / (CHUNK_WIDTH * CHUNK_WIDTH));

  return [x, y, z];
}

/**
 * All inputs must be non-negative integers.
 * The output will be a non-negative integer.
 */
function getBlockIndexFromBlockCoords(x: number, y: number, z: number): number {
  return x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_WIDTH;
}

function addPendingBlocksToScene(
  factoryDict: BlockInstancedMeshFactoryDict,
  x: number,
  z: number,
  scene: Scene,
  meshDict: BlockMeshDict
): void {
  for (const blockType of Object.values(BlockTypes)) {
    if (blockType === BlockTypes.Blank) {
      continue;
    }

    const factory = factoryDict[blockType];
    const mesh = meshDict[blockType];
    const instanced = getInstancedMeshFromFactory(factory, x, z, mesh);
    scene.add(instanced);
  }
}

function getInstancedMeshFromFactory(
  factory: BlockInstancedMeshFactory,
  chunkX: number,
  chunkZ: number,
  mesh: Mesh
): InstancedMesh {
  const chunkXScaled = chunkX * CHUNK_WIDTH * BLOCK_SIZE;
  const chunkZScaled = chunkZ * CHUNK_WIDTH * BLOCK_SIZE;

  const len = getBlockLength(factory);
  const instanced = new InstancedMesh(mesh.geometry, mesh.material, len);

  for (let i = 0; i < len; ++i) {
    const localX = factory.localCoords[i * 3 + 0];
    const localY = factory.localCoords[i * 3 + 1];
    const localZ = factory.localCoords[i * 3 + 2];
    instanced.setMatrixAt(
      i,
      new Matrix4().makeTranslation(
        chunkXScaled + localX * BLOCK_SIZE,
        localY * BLOCK_SIZE,
        chunkZScaled + localZ * BLOCK_SIZE
      )
    );
  }

  return instanced;
}

function getBlockLength(factory: BlockInstancedMeshFactory): number {
  return factory.localCoords.length / 3;
}
