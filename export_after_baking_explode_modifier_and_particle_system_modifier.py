# IMPORTANT
#
# 1. Make sure to select frame 1 in the Timeline Editor.
# 2. Make sure to select the correct animation.
# 3. Make sure to select the body mesh
#    (i.e., the mesh with the armature modifier).
# 4. This script may mess up the .blend file.
#    So, after you run this script,
#    do **not** save the .blend file.

import bpy

# Filename
filename = "/Users/kyle/enbito/public/models/edamame_unarmed_frames/explode/explode"

def blender_frame_to_output_frame(blender_frame):
    return (blender_frame - 1) / 2 + 1

# For some reason, the script doesn't work if I
# use a for-loop.
# So, I have to "unwrap" the loop
# (i.e., manually copy and paste the code).

f = 1
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 3
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 5
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 7
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 9
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 11
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 13
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 15
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 17
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 19
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 21
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 23
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 25
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 27
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 29
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 31
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 33
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 35
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 37
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 39
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
f = 41
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Explode")
bpy.ops.object.modifier_apply(modifier="ParticleSystem")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, blender_frame_to_output_frame(f)),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
bpy.ops.ed.undo()
