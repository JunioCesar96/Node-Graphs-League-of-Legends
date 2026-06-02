"""Golden test — parse _preview.md."""

from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "blender", "node_graphs_lol"))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from core.ritual_parse_vfx import parse_ritual_vfx


def main() -> int:
    preview_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "_preview.md"))
    with open(preview_path, encoding="utf-8") as handle:
        content = handle.read()

    system = parse_ritual_vfx(content)
    assert system.particle_name == "Zac_Base_Q_tar", system.particle_name
    assert len(system.emitters) == 3, len(system.emitters)

    names = [emitter.name for emitter in system.emitters]
    assert names == ["Ring", "Splat", "Juice"], names

    ring = system.emitters[0]
    assert ring.mesh_path and "Zac_Ult_Slam_Cyl.scb" in ring.mesh_path
    assert ring.birth_scale0 and ring.birth_scale0.constant == (40.0, 40.0, 40.0)

    splat = system.emitters[1]
    assert splat.num_frames == 16
    assert splat.tex_div == (2.0, 2.0)

    juice = system.emitters[2]
    assert juice.mesh_path and "Zac_Goo_Sphere.scb" in juice.mesh_path
    assert juice.birth_velocity and juice.birth_velocity.constant == (800.0, 2000.0, 800.0)

    print("golden test OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
