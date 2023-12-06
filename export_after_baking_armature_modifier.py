# IMPORTANT
#
# 1. Make sure to select the correct animation.
# 2. Make sure to select the body mesh
#    (i.e., the mesh with the armature modifier).
# 3. This script may mess up the .blend file.
#    So, after you run this script,
#    do **not** save the .blend file.

import bpy

# First frame to export
frame_start = 1

# Last frame to export
frame_end = 29

# Filename
filename = "/Users/kyle/enbito/public/models/edamame_spear_frames/stab/stab"

# For some reason, the script doesn't work if I
# use a for-loop.
# So, I have to "unwrap" the loop
# (i.e., manually copy and paste the code).

f = 1
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 2
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 3
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 4
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 5
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 6
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 7
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 8
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 9
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 10
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 11
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 12
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 13
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 14
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 15
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 16
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 17
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 18
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 19
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 20
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 21
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 22
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 23
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 24
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 25
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 26
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 27
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 28
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()
f = 29
bpy.context.scene.frame_set(f)
bpy.ops.object.modifier_apply(modifier="Armature")
bpy.ops.export_scene.gltf(
    filepath="%s.f%04d.glb" % (filename, f),
    export_animations=False,
    export_skins=False,
    export_current_frame=True,
)
bpy.ops.ed.undo()