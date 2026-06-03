import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import {
  applyVfxViewportProjectionFraming,
  VFX_VIEWPORT_CAMERA_FOV,
  VFX_VIEWPORT_UP,
  type VfxViewportProjectionFraming,
} from '@/core/vfx/vfxViewportViews'

type VfxViewportProjectionSyncProps = {
  orthographic: boolean
  controlsRef: RefObject<OrbitControlsImpl | null>
  pendingFramingRef: MutableRefObject<VfxViewportProjectionFraming | null>
}

/** Aplica zoom/distância equivalentes após o Canvas trocar perspectiva ↔ ortográfica. */
export function VfxViewportProjectionSync({
  orthographic,
  controlsRef,
  pendingFramingRef,
}: VfxViewportProjectionSyncProps) {
  const { camera, size } = useThree()
  const prevOrthographic = useRef(orthographic)

  useLayoutEffect(() => {
    const framing = pendingFramingRef.current
    const projectionChanged = prevOrthographic.current !== orthographic

    if (framing) {
      applyVfxViewportProjectionFraming(
        camera,
        framing,
        orthographic,
        VFX_VIEWPORT_CAMERA_FOV,
        size.height,
      )
      const controls = controlsRef.current
      if (controls) {
        controls.object.up.copy(VFX_VIEWPORT_UP)
        controls.target.copy(framing.target)
        controls.update()
      }
      pendingFramingRef.current = null
    } else if (projectionChanged) {
      camera.up.copy(VFX_VIEWPORT_UP)
      camera.updateProjectionMatrix()
      controlsRef.current?.object.up.copy(VFX_VIEWPORT_UP)
    }

    prevOrthographic.current = orthographic
  }, [camera, controlsRef, orthographic, pendingFramingRef, size.height])

  return null
}
