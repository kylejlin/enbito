import bpy

# First frame to export
frame_start = 1

# Last frame to export
frame_end = 29

# Filename
filename = "/Users/kyle/enbito/public/models/edamame_unarmed_frames/explode/explode"

for f in range(frame_start, frame_end + 1):
    bpy.context.scene.frame_set(f)
    bpy.ops.export_scene.gltf(
        filepath="%s.f%04d.glb" % (filename, f),
        export_animations=False,
        export_skins=False,
        export_current_frame=True,
    )
