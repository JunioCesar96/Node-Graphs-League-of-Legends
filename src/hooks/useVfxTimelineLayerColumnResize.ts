import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  clampVfxTimelineLayerColumnWidth,
  loadVfxTimelineLayerColumnWidth,
  saveVfxTimelineLayerColumnWidth,
  VFX_TIMELINE_LAYER_COLUMN_WIDTH_DEFAULT,
} from '@/core/vfx/vfxDockSplitPreferences'

type LayerColumnDragPhase = {
  startX: number
  startWidth: number
}

export function useVfxTimelineLayerColumnResize() {
  const [layerColumnWidth, setLayerColumnWidth] = useState(VFX_TIMELINE_LAYER_COLUMN_WIDTH_DEFAULT)
  const dragPhaseRef = useRef<LayerColumnDragPhase | null>(null)

  useEffect(() => {
    const stored = loadVfxTimelineLayerColumnWidth()
    if (stored !== null) {
      setLayerColumnWidth(clampVfxTimelineLayerColumnWidth(stored))
    }
  }, [])

  const onLayerColumnResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return
      }

      event.preventDefault()
      dragPhaseRef.current = {
        startX: event.clientX,
        startWidth: layerColumnWidth,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [layerColumnWidth],
  )

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const phase = dragPhaseRef.current
      if (!phase) {
        return
      }

      const deltaX = event.clientX - phase.startX
      setLayerColumnWidth(clampVfxTimelineLayerColumnWidth(phase.startWidth + deltaX))
    }

    const stop = () => {
      if (!dragPhaseRef.current) {
        return
      }

      dragPhaseRef.current = null
      setLayerColumnWidth((current) => {
        const clamped = clampVfxTimelineLayerColumnWidth(current)
        saveVfxTimelineLayerColumnWidth(clamped)
        return clamped
      })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const tracksShellStyle = {
    '--vfx-timeline-layer-col-width': `${layerColumnWidth}px`,
  } as CSSProperties

  const ensureLayerColumnWidth = useCallback((minimumWidth: number) => {
    setLayerColumnWidth((current) => {
      if (current >= minimumWidth) {
        return current
      }
      const next = clampVfxTimelineLayerColumnWidth(minimumWidth)
      saveVfxTimelineLayerColumnWidth(next)
      return next
    })
  }, [])

  return {
    layerColumnWidth,
    onLayerColumnResizePointerDown,
    tracksShellStyle,
    ensureLayerColumnWidth,
  }
}
