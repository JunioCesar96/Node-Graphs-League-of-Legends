import { useEffect, useRef, type RefObject } from 'react'
import type * as MonacoType from 'monaco-editor'

import { useRitualDrag } from '@/ritualDrag/RitualDragContext'
import {
  isPositionInSelection,
  pointerDragDistance,
  readSelectionRitualRange,
  readSelectionRitualText,
  RITUAL_DRAG_MOVE_THRESHOLD_PX,
  type RitualDragTextRange,
} from '@/ritualDrag/ritualDragSelection'

type PendingRitualPointer = {
  originX: number
  originY: number
  text: string
  textRange: RitualDragTextRange
  mode: 'neeko' | 'link'
}

function startLinkDragFromEditor(
  drag: ReturnType<typeof useRitualDrag>,
  editor: MonacoType.editor.IStandaloneCodeEditor,
  pointer: { x: number; y: number },
): boolean {
  const text = readSelectionRitualText(editor)
  const textRange = readSelectionRitualRange(editor)
  if (!text || !textRange) {
    return false
  }
  drag.startLinkDrag(text, pointer, textRange)
  return true
}

export function useCodeDockRitualDrag(
  editorRef: RefObject<MonacoType.editor.IStandaloneCodeEditor | null>,
  editorMounted: boolean,
) {
  const ritualDrag = useRitualDrag()
  const pendingRef = useRef<PendingRitualPointer | null>(null)
  const editorSelectingRef = useRef(false)
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
        if (drag.phase === 'dragging' || drag.phase === 'linkDragging') {
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

        if (editorSelectingRef.current && mouseEvent.shiftKey) {
          if (startLinkDragFromEditor(drag, editor, pointer)) {
            editorSelectingRef.current = false
            pendingRef.current = null
          }
          return
        }

        if (mouseEvent.shiftKey) {
          drag.showHintLink(pointer)
        } else if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
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

        const position = event.target.position
        if (!position) {
          editorSelectingRef.current = false
          return
        }

        const selection = editor.getSelection()
        const insideSelection =
          selection && !selection.isEmpty() && isPositionInSelection(selection, position)

        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
          editorSelectingRef.current = false
          if (!insideSelection) {
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
            textRange: readSelectionRitualRange(editor)!,
            mode: 'neeko',
          }
          return
        }

        if (mouseEvent.shiftKey && insideSelection) {
          editorSelectingRef.current = false
          const text = readSelectionRitualText(editor)
          const textRange = readSelectionRitualRange(editor)
          if (!text || !textRange) {
            return
          }

          mouseEvent.preventDefault()
          mouseEvent.stopPropagation()

          pendingRef.current = {
            originX: mouseEvent.clientX,
            originY: mouseEvent.clientY,
            text,
            textRange,
            mode: 'link',
          }
          return
        }

        editorSelectingRef.current = true
        pendingRef.current = null
      }),
    )

    disposables.push(
      editor.onMouseUp(() => {
        editorSelectingRef.current = false
      }),
    )

    return () => {
      pendingRef.current = null
      editorSelectingRef.current = false
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
      dom.classList.remove('codeDockRitualLink')
    } else if (ritualDrag.phase === 'hintLink' || ritualDrag.phase === 'linkDragging') {
      dom.classList.remove('codeDockRitualGrab')
      dom.classList.add('codeDockRitualLink')
    } else {
      dom.classList.remove('codeDockRitualGrab')
      dom.classList.remove('codeDockRitualLink')
    }

    return () => {
      dom.classList.remove('codeDockRitualGrab')
      dom.classList.remove('codeDockRitualLink')
    }
  }, [editorMounted, editorRef, ritualDrag.phase])

  useEffect(() => {
    if (ritualDrag.phase === 'linkDragging') {
      document.body.classList.add('ritualLinkDragging')
    } else {
      document.body.classList.remove('ritualLinkDragging')
    }

    return () => {
      document.body.classList.remove('ritualLinkDragging')
    }
  }, [ritualDrag.phase])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = ritualDragRef.current
      const pending = pendingRef.current

      if (pending) {
        drag.updatePointer({ x: event.clientX, y: event.clientY })

        if (
          drag.phase !== 'dragging' &&
          drag.phase !== 'linkDragging' &&
          pointerDragDistance(pending.originX, pending.originY, event.clientX, event.clientY) >=
            RITUAL_DRAG_MOVE_THRESHOLD_PX
        ) {
          if (pending.mode === 'link') {
            drag.startLinkDrag(pending.text, { x: event.clientX, y: event.clientY }, pending.textRange)
          } else {
            drag.startDrag(pending.text, { x: event.clientX, y: event.clientY })
          }
          pendingRef.current = null
          editorSelectingRef.current = false
        }
        return
      }

      if (editorSelectingRef.current && event.shiftKey) {
        const editor = editorRef.current
        if (editor && startLinkDragFromEditor(drag, editor, { x: event.clientX, y: event.clientY })) {
          editorSelectingRef.current = false
        }
        return
      }

      if (
        drag.phase === 'hint' ||
        drag.phase === 'hintCtrl' ||
        drag.phase === 'hintLink' ||
        drag.phase === 'dragging' ||
        drag.phase === 'linkDragging' ||
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
        if (
          drag.phase === 'hint' ||
          drag.phase === 'hintCtrl' ||
          drag.phase === 'hintLink'
        ) {
          drag.hideHint()
        }
      }
      editorSelectingRef.current = false
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [editorRef])
}
