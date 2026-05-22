import { useEffect, useRef, type RefObject } from 'react'
import type * as MonacoType from 'monaco-editor'

import { useRitualDrag } from '@/ritualDrag/RitualDragContext'
import {
  isPositionInSelection,
  pointerDragDistance,
  readSelectionRitualText,
  RITUAL_DRAG_MOVE_THRESHOLD_PX,
} from '@/ritualDrag/ritualDragSelection'

type PendingRitualPointer = {
  originX: number
  originY: number
  text: string
}

export function useCodeDockRitualDrag(
  editorRef: RefObject<MonacoType.editor.IStandaloneCodeEditor | null>,
  editorMounted: boolean,
) {
  const ritualDrag = useRitualDrag()
  const pendingRef = useRef<PendingRitualPointer | null>(null)
  const ritualDragRef = useRef(ritualDrag)
  ritualDragRef.current = ritualDrag

  useEffect(() => {
    if (!editorMounted) {
      return
    }

    const editor = editorRef.current
    if (!editor) {
      return
    }

    const disposables: MonacoType.IDisposable[] = []

    disposables.push(
      editor.onMouseMove((event) => {
        const drag = ritualDragRef.current
        if (drag.phase === 'dragging') {
          return
        }

        const position = event.target.position
        if (!position) {
          drag.hideHint()
          return
        }

        const selection = editor.getSelection()
        if (!selection || !isPositionInSelection(selection, position)) {
          drag.hideHint()
          return
        }

        const mouseEvent = event.event.browserEvent
        const pointer = { x: mouseEvent.clientX, y: mouseEvent.clientY }
        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
          drag.showHintCtrl(pointer)
        } else {
          drag.showHint(pointer)
        }
      }),
    )

    disposables.push(
      editor.onMouseLeave(() => {
        ritualDragRef.current.hideHint()
      }),
    )

    disposables.push(
      editor.onMouseDown((event) => {
        const mouseEvent = event.event.browserEvent
        if (mouseEvent.button !== 0) {
          return
        }
        if (!(mouseEvent.ctrlKey || mouseEvent.metaKey)) {
          return
        }

        const position = event.target.position
        if (!position) {
          return
        }

        const selection = editor.getSelection()
        if (!selection || !isPositionInSelection(selection, position)) {
          return
        }

        const text = readSelectionRitualText(editor)
        if (!text) {
          return
        }

        mouseEvent.preventDefault()
        mouseEvent.stopPropagation()

        pendingRef.current = {
          originX: mouseEvent.clientX,
          originY: mouseEvent.clientY,
          text,
        }
      }),
    )

    return () => {
      pendingRef.current = null
      for (const disposable of disposables) {
        try {
          disposable.dispose()
        } catch {
          /* ignore */
        }
      }
    }
  }, [editorMounted, editorRef])

  useEffect(() => {
    const editor = editorRef.current
    const dom = editor?.getDomNode()
    if (!dom) {
      return
    }

    if (ritualDrag.phase === 'hintCtrl') {
      dom.classList.add('codeDockRitualGrab')
    } else {
      dom.classList.remove('codeDockRitualGrab')
    }

    return () => {
      dom.classList.remove('codeDockRitualGrab')
    }
  }, [editorMounted, editorRef, ritualDrag.phase])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      const pending = pendingRef.current

      if (pending) {
        drag.updatePointer({ x: event.clientX, y: event.clientY })

        if (
          drag.phase !== 'dragging' &&
          pointerDragDistance(pending.originX, pending.originY, event.clientX, event.clientY) >=
            RITUAL_DRAG_MOVE_THRESHOLD_PX
        ) {
          drag.startDrag(pending.text, { x: event.clientX, y: event.clientY })
          pendingRef.current = null
        }
        return
      }

      if (
        drag.phase === 'hint' ||
        drag.phase === 'hintCtrl' ||
        drag.phase === 'dragging' ||
        drag.phase === 'buildingNeeko' ||
        drag.phase === 'readyNeeko'
      ) {
        drag.updatePointer({ x: event.clientX, y: event.clientY })
      }
    }

    const onPointerUp = () => {
      const drag = ritualDragRef.current
      if (pendingRef.current) {
        pendingRef.current = null
        if (drag.phase === 'hint' || drag.phase === 'hintCtrl') {
          drag.hideHint()
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])
}
