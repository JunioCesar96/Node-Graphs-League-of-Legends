import { useEffect, useRef, type RefObject } from 'react'

import type { CanvasPosition } from '@/core/canvasScene'
import type { RitualDragContextValue } from '@/ritualDrag/RitualDragContext'
import {
  collectNeekoRitualDropTargetIds,
  resolveRitualDropTargetFromPoint,
} from '@/ritualDrag/resolveRitualDropTarget'

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

function isCtrlRitualKey(event: KeyboardEvent): boolean {
  return event.key === 'Control' || event.key === 'Meta'
}

export function useRitualDragCanvasDrop(options: {
  ritualDrag: RitualDragContextValue | null
  scale: number
  sceneNodes: readonly {
    id: string
    node: { schema: { id: string } }
    locked?: boolean
    neekoTransformPhase?: string
  }[]
  canvasRef: RefObject<HTMLDivElement | null>
  viewportBodyRef: RefObject<HTMLDivElement | null>
  onNeekoDropCode?: (canvasNodeId: string, text: string) => void
  onBuildNeekoAtPosition?: (position: CanvasPosition) => string | null
  onNeekoBuildFailed?: () => void
}) {
  const {
    ritualDrag,
    scale,
    sceneNodes,
    canvasRef,
    viewportBodyRef,
    onNeekoDropCode,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
  } = options

  const ritualDragRef = useRef(ritualDrag)
  ritualDragRef.current = ritualDrag

  const neekoDropTargetIdsRef = useRef(collectNeekoRitualDropTargetIds(sceneNodes))
  neekoDropTargetIdsRef.current = collectNeekoRitualDropTargetIds(sceneNodes)

  const ctrlSpawnTriggeredRef = useRef(false)

  const ritualDragPhase = ritualDrag?.phase ?? 'idle'

  useEffect(() => {
    const activePhases = new Set(['dragging', 'buildingNeeko', 'readyNeeko'])
    if (!activePhases.has(ritualDragPhase)) {
      ctrlSpawnTriggeredRef.current = false
      return
    }

    const api = ritualDragRef.current
    if (!api || !onNeekoDropCode) {
      return
    }

    const spawnNeekoAtPointer = (clientX: number, clientY: number): boolean => {
      const drag = ritualDragRef.current
      if (!drag || drag.phase !== 'dragging' || !canvasRef.current) {
        return false
      }

      if (ctrlSpawnTriggeredRef.current) {
        return false
      }

      const target = resolveRitualDropTargetFromPoint(clientX, clientY, {
        neekoNodeIds: neekoDropTargetIdsRef.current,
        viewportBodyEl: viewportBodyRef.current,
      })

      if (target.kind !== 'emptyCanvas') {
        return false
      }

      const canvasPosition = graphClientToPosition(canvasRef.current, scale, clientX, clientY)
      const pointer = { x: clientX, y: clientY }

      if (!onBuildNeekoAtPosition) {
        onNeekoBuildFailed?.()
        drag.cancel()
        return false
      }

      const canvasNodeId = onBuildNeekoAtPosition(canvasPosition)
      if (!canvasNodeId) {
        onNeekoBuildFailed?.()
        drag.cancel()
        return false
      }

      ctrlSpawnTriggeredRef.current = true
      drag.placeNeekoReady(canvasPosition, canvasNodeId, pointer)
      return true
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      if (!drag) {
        return
      }

      drag.updatePointer({ x: event.clientX, y: event.clientY })

      const target = resolveRitualDropTargetFromPoint(event.clientX, event.clientY, {
        neekoNodeIds: neekoDropTargetIdsRef.current,
        viewportBodyEl: viewportBodyRef.current,
      })

      if (target.kind === 'neeko') {
        drag.setHoveredNeeko(target.canvasNodeId)
        return
      }

      if (drag.phase === 'readyNeeko' && drag.neekoStaging?.canvasNodeId) {
        drag.setHoveredNeeko(drag.neekoStaging.canvasNodeId)
        return
      }

      if (drag.phase === 'buildingNeeko') {
        drag.setHoveredNeeko(null)
        return
      }

      drag.setHoveredNeeko(null)
    }

    const onCtrlSpawnKey = (event: KeyboardEvent) => {
      if (!isCtrlRitualKey(event)) {
        return
      }

      if (event.type === 'keydown' && event.repeat) {
        return
      }

      const drag = ritualDragRef.current
      if (!drag || drag.phase !== 'dragging') {
        return
      }

      event.preventDefault()
      spawnNeekoAtPointer(drag.pointer.x, drag.pointer.y)
    }

    const onPointerUp = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      if (!drag) {
        return
      }

      const target = resolveRitualDropTargetFromPoint(event.clientX, event.clientY, {
        neekoNodeIds: neekoDropTargetIdsRef.current,
        viewportBodyEl: viewportBodyRef.current,
      })

      if (drag.phase === 'readyNeeko' && drag.neekoStaging?.canvasNodeId) {
        const text = drag.consumeDrop()
        if (text) {
          onNeekoDropCode(drag.neekoStaging.canvasNodeId, text)
        }
        return
      }

      if (target.kind === 'neeko') {
        const text = drag.consumeDrop()
        if (text) {
          onNeekoDropCode(target.canvasNodeId, text)
        }
        return
      }

      drag.cancel()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onCtrlSpawnKey, true)
    window.addEventListener('keyup', onCtrlSpawnKey, true)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onCtrlSpawnKey, true)
      window.removeEventListener('keyup', onCtrlSpawnKey, true)
      ritualDragRef.current?.setHoveredNeeko(null)
    }
  }, [
    canvasRef,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
    onNeekoDropCode,
    ritualDragPhase,
    scale,
    viewportBodyRef,
  ])
}
