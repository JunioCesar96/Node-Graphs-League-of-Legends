import { useCallback, useEffect, type MutableRefObject, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import {
  captureVfxViewportProjectionFraming,
  VFX_VIEWPORT_CAMERA_FOV,
  VFX_VIEWPORT_UP,
  type VfxViewportProjectionFraming,
} from '@/core/vfx/vfxViewportViews'
import { useVfxViewportShortcutHandlers } from '@/shortcuts/useVfxViewportShortcutHandlers'

type VfxViewportNavigationProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>
  enabled: boolean
  orthographicProjection: boolean
  onOrthographicProjectionChange: (next: boolean) => void
  onRegisterProjectionToggle: (toggle: (() => void) | null) => void
  pendingFramingRef: MutableRefObject<VfxViewportProjectionFraming | null>
}

/** Atalhos Blender (7/3/1 + Ctrl, 5 persp/ortho) e `object.up` Z-up para órbita. */
export function VfxViewportNavigation({
  controlsRef,
  enabled,
  orthographicProjection,
  onOrthographicProjectionChange,
  onRegisterProjectionToggle,
  pendingFramingRef,
}: VfxViewportNavigationProps) {
  const { camera, size } = useThree()

  const toggleProjection = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    pendingFramingRef.current = captureVfxViewportProjectionFraming(
      camera,
      controls.target,
      VFX_VIEWPORT_CAMERA_FOV,
      size.height,
    )
    onOrthographicProjectionChange(!orthographicProjection)
  }, [
    camera,
    controlsRef,
    onOrthographicProjectionChange,
    orthographicProjection,
    pendingFramingRef,
    size.height,
  ])

  useEffect(() => {
    if (!enabled) {
      onRegisterProjectionToggle(null)
      return
    }
    onRegisterProjectionToggle(toggleProjection)
    return () => onRegisterProjectionToggle(null)
  }, [enabled, onRegisterProjectionToggle, toggleProjection])

  useEffect(() => {
    if (!enabled) return
    const controls = controlsRef.current
    if (controls) {
      controls.object.up.copy(VFX_VIEWPORT_UP)
    }
    camera.up.copy(VFX_VIEWPORT_UP)
  }, [camera, controlsRef, enabled])

  useVfxViewportShortcutHandlers({
    enabled,
    controlsRef,
    onToggleProjection: toggleProjection,
  })

  return null
}
