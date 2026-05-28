import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { RefObject } from 'react'

import {
  applyVfxViewportView,
  resolveVfxViewportProjectionToggleFromKeyboard,
  type VfxViewportProjectionFraming,
  type VfxViewportViewId,
} from '@/core/vfx/vfxViewportViews'

import { useShortcutScope } from './ShortcutScopeProvider'

const VIEW_BY_BINDING: Record<string, VfxViewportViewId> = {
  'vfx-view-top': 'top',
  'vfx-view-bottom': 'bottom',
  'vfx-view-right': 'right',
  'vfx-view-left': 'left',
  'vfx-view-front': 'front',
  'vfx-view-back': 'back',
}

export function useVfxViewportShortcutHandlers(options: {
  enabled: boolean
  controlsRef: RefObject<OrbitControlsImpl | null>
  onToggleProjection: () => void
}) {
  const { camera } = useThree()
  const { registerShortcutHandlers } = useShortcutScope()
  const controlsRef = options.controlsRef
  const toggleRef = useRef(options.onToggleProjection)
  toggleRef.current = options.onToggleProjection

  useEffect(() => {
    if (!options.enabled) {
      return undefined
    }

    const viewHandlers = Object.fromEntries(
      Object.entries(VIEW_BY_BINDING).map(([bindingId, viewId]) => [
        bindingId,
        () => {
          const controls = controlsRef.current
          if (!controls) {
            return false
          }
          applyVfxViewportView({ viewId, camera, controls })
          return true
        },
      ]),
    )

    return registerShortcutHandlers({
      ...viewHandlers,
      'vfx-projection-toggle': (event) => {
        if (!resolveVfxViewportProjectionToggleFromKeyboard(event)) {
          return false
        }
        toggleRef.current()
        return true
      },
    })
  }, [camera, controlsRef, options.enabled, registerShortcutHandlers])
}

export type { VfxViewportProjectionFraming }
