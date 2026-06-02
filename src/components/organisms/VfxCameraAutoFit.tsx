import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Box3, PerspectiveCamera, Vector3, type BufferGeometry } from 'three'

import { VFX_VIEWPORT_UP } from '@/core/vfx/vfxViewportViews'

type VfxCameraAutoFitProps = {
  geometry: BufferGeometry | null
  controlsRef: RefObject<OrbitControlsImpl | null>
  fitKey: number
}

export function VfxCameraAutoFit({ geometry, controlsRef, fitKey }: VfxCameraAutoFitProps) {
  const { camera } = useThree()

  useEffect(() => {
    if (!geometry || !(camera instanceof PerspectiveCamera)) return

    geometry.computeBoundingBox()
    const box = geometry.boundingBox ?? new Box3()
    if (box.isEmpty()) return

    const center = new Vector3()
    const size = new Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
    const distance = maxDim * 1.9

    camera.position.set(
      center.x + distance * 0.55,
      center.y - distance * 0.55,
      center.z + distance * 0.65,
    )
    camera.up.copy(VFX_VIEWPORT_UP)
    camera.lookAt(center)
    camera.near = Math.max(0.01, maxDim / 500)
    camera.far = Math.max(200, maxDim * 30)
    camera.updateProjectionMatrix()

    const controls = controlsRef.current
    if (controls) {
      controls.object.up.copy(VFX_VIEWPORT_UP)
      controls.target.copy(center)
      controls.update()
    }
  }, [camera, controlsRef, fitKey, geometry])

  return null
}
