import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { useRitualDragShortcutHandlers } from '@/shortcuts/useRitualDragShortcutHandlers'

import type { CanvasPosition } from '@/core/canvasScene'
import type { RitualDragContextValue } from '@/ritualDrag/RitualDragContext'
import {
  collectNeekoRitualDropTargetIds,
  resolveLinkDropTargetFromPoint,
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
  onBindCodeRangeToNode?: (
    canvasNodeId: string,
    payload: { text: string; textRange: import('@/ritualDrag/ritualDragSelection').RitualDragTextRange },
  ) => void
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
    onBindCodeRangeToNode,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
  } = options

  const ritualDragRef = useRef(ritualDrag)
  ritualDragRef.current = ritualDrag

  const neekoDropTargetIdsRef = useRef(collectNeekoRitualDropTargetIds(sceneNodes))
  neekoDropTargetIdsRef.current = collectNeekoRitualDropTargetIds(sceneNodes)

  const linkDropNodeIdsRef = useRef(
    new Set(sceneNodes.filter((n) => !n.locked).map((n) => n.id)),
  )
  linkDropNodeIdsRef.current = new Set(sceneNodes.filter((n) => !n.locked).map((n) => n.id))

  const ctrlSpawnTriggeredRef = useRef(false)

  const ritualDragPhase = ritualDrag?.phase ?? 'idle'

  const spawnNeekoAtPointer = useCallback((clientX: number, clientY: number): boolean => {
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
  }, [
    canvasRef,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
    scale,
    viewportBodyRef,
  ])

  useRitualDragShortcutHandlers({
    ritualDrag,
    spawnNeekoAtPointer,
  })

  useEffect(() => {
    const neekoPhases = new Set(['dragging', 'buildingNeeko', 'readyNeeko'])
    const linkPhases = new Set(['linkDragging'])

    if (!neekoPhases.has(ritualDragPhase) && !linkPhases.has(ritualDragPhase)) {
      ctrlSpawnTriggeredRef.current = false
      return
    }

    const api = ritualDragRef.current
    if (!api) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      if (!drag) {
        return
      }

      drag.updatePointer({ x: event.clientX, y: event.clientY })

      if (drag.phase === 'linkDragging') {
        const linkTarget = resolveLinkDropTargetFromPoint(event.clientX, event.clientY, {
          viewportBodyEl: viewportBodyRef.current,
          allowedNodeIds: linkDropNodeIdsRef.current,
        })
        drag.setHoveredLinkNode(linkTarget.kind === 'linkNode' ? linkTarget.canvasNodeId : null)
        return
      }

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

    const onPointerUp = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      if (!drag) {
        return
      }

      if (drag.phase === 'linkDragging') {
        const linkTarget = resolveLinkDropTargetFromPoint(event.clientX, event.clientY, {
          viewportBodyEl: viewportBodyRef.current,
          allowedNodeIds: linkDropNodeIdsRef.current,
        })

        if (linkTarget.kind === 'linkNode' && onBindCodeRangeToNode) {
          const payload = drag.consumeLinkBindDrop()
          if (payload) {
            onBindCodeRangeToNode(linkTarget.canvasNodeId, payload)
          }
        } else {
          drag.cancel()
        }
        return
      }

      const target = resolveRitualDropTargetFromPoint(event.clientX, event.clientY, {
        neekoNodeIds: neekoDropTargetIdsRef.current,
        viewportBodyEl: viewportBodyRef.current,
      })

      if (drag.phase === 'readyNeeko' && drag.neekoStaging?.canvasNodeId) {
        const text = drag.consumeDrop()
        if (text) {
          onNeekoDropCode?.(drag.neekoStaging.canvasNodeId, text)
        }
        return
      }

      if (target.kind === 'neeko') {
        const text = drag.consumeDrop()
        if (text) {
          onNeekoDropCode?.(target.canvasNodeId, text)
        }
        return
      }

      drag.cancel()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      ritualDragRef.current?.setHoveredNeeko(null)
      ritualDragRef.current?.setHoveredLinkNode(null)
    }
  }, [
    canvasRef,
    onBuildNeekoAtPosition,
    onBindCodeRangeToNode,
    onNeekoBuildFailed,
    onNeekoDropCode,
    ritualDragPhase,
    scale,
    viewportBodyRef,
  ])
}
