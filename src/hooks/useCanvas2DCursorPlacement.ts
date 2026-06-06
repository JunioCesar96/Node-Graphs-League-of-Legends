import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  CANVAS_2D_CURSOR_RESET_HOLD_MS,
  DEFAULT_CANVAS_2D_CURSOR_POSITION,
} from '@/core/canvas2DCursor'
import type { CanvasPosition } from '@/core/canvasScene'

type PlacementGesture = {
  pointerId: number
  resetTimeoutId: ReturnType<typeof window.setTimeout>
  resetTriggered: boolean
  targetPosition: CanvasPosition
}

function graphClientToPosition(
  canvasEl: HTMLElement,
  scale: number,
  clientX: number,
  clientY: number,
): CanvasPosition {
  const rect = canvasEl.getBoundingClientRect()

  return {
    x: Math.round((clientX - rect.left) / scale),
    y: Math.round((clientY - rect.top) / scale),
  }
}

function isCtrlRightPointerButton(event: PointerEvent): boolean {
  return event.button === 2 && (event.ctrlKey || event.metaKey)
}

export function useCanvas2DCursorPlacement(options: {
  canvasRef: RefObject<HTMLDivElement | null>
  viewportBodyRef: RefObject<HTMLDivElement | null>
  scale: number
}) {
  const { canvasRef, viewportBodyRef, scale } = options
  const [position, setPosition] = useState<CanvasPosition>(DEFAULT_CANVAS_2D_CURSOR_POSITION)
  const placementGestureRef = useRef<PlacementGesture | null>(null)

  const finishPlacementGesture = useCallback((event: PointerEvent, releaseCaptureEl: HTMLElement | null) => {
    const gesture = placementGestureRef.current

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return
    }

    window.clearTimeout(gesture.resetTimeoutId)

    if (!gesture.resetTriggered) {
      setPosition(gesture.targetPosition)
    }

    placementGestureRef.current = null

    if (releaseCaptureEl?.hasPointerCapture(event.pointerId)) {
      releaseCaptureEl.releasePointerCapture(event.pointerId)
    }
  }, [])

  const beginPlacementGesture = useCallback(
    (event: PointerEvent) => {
      const canvasEl = canvasRef.current
      const viewportEl = viewportBodyRef.current

      if (!canvasEl || !viewportEl || !isCtrlRightPointerButton(event)) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()

      const existing = placementGestureRef.current
      if (existing) {
        window.clearTimeout(existing.resetTimeoutId)
      }

      const targetPosition = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)
      const resetTimeoutId = window.setTimeout(() => {
        const active = placementGestureRef.current
        if (!active) {
          return
        }

        active.resetTriggered = true
        setPosition(DEFAULT_CANVAS_2D_CURSOR_POSITION)
      }, CANVAS_2D_CURSOR_RESET_HOLD_MS)

      placementGestureRef.current = {
        pointerId: event.pointerId,
        resetTimeoutId,
        resetTriggered: false,
        targetPosition,
      }

      viewportEl.setPointerCapture(event.pointerId)
      return true
    },
    [canvasRef, scale, viewportBodyRef],
  )

  useEffect(() => {
    const viewportEl = viewportBodyRef.current

    if (!viewportEl) {
      return
    }

    const handlePointerDownCapture = (event: PointerEvent) => {
      beginPlacementGesture(event)
    }

    const handlePointerUpCapture = (event: PointerEvent) => {
      finishPlacementGesture(event, viewportEl)
    }

    const handlePointerCancelCapture = (event: PointerEvent) => {
      finishPlacementGesture(event, viewportEl)
    }

    const handleContextMenuCapture = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    viewportEl.addEventListener('pointerdown', handlePointerDownCapture, { capture: true })
    viewportEl.addEventListener('pointerup', handlePointerUpCapture, { capture: true })
    viewportEl.addEventListener('pointercancel', handlePointerCancelCapture, { capture: true })
    viewportEl.addEventListener('contextmenu', handleContextMenuCapture, { capture: true })

    return () => {
      viewportEl.removeEventListener('pointerdown', handlePointerDownCapture, { capture: true })
      viewportEl.removeEventListener('pointerup', handlePointerUpCapture, { capture: true })
      viewportEl.removeEventListener('pointercancel', handlePointerCancelCapture, { capture: true })
      viewportEl.removeEventListener('contextmenu', handleContextMenuCapture, { capture: true })

      const active = placementGestureRef.current
      if (active) {
        window.clearTimeout(active.resetTimeoutId)
        placementGestureRef.current = null
      }
    }
  }, [beginPlacementGesture, finishPlacementGesture, viewportBodyRef])

  return {
    cursor2DPosition: position,
    setCursor2DPosition: setPosition,
  }
}

export type Canvas2DCursorPlacement = ReturnType<typeof useCanvas2DCursorPlacement>
