import { Skeleton } from "three";

// https://gist.github.com/cdata/f2d7a6ccdec071839bc1954c32595e87

export function cloneGltf(gltf) {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true),
  };

  const skinnedMeshes = {};

  gltf.scene.traverse((node) => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse((node) => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
      new Skeleton(orderedCloneBones, skeleton.boneInverses),
      cloneSkinnedMesh.matrixWorld
    );
  }

  return clone;
}
