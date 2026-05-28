import { useEffect, useRef } from 'react'

import type { RitualDragContextValue } from '@/ritualDrag/RitualDragContext'

import { useShortcutScope } from './ShortcutScopeProvider'

function isCtrlRitualKey(event: KeyboardEvent): boolean {
  return event.key === 'Control' || event.key === 'Meta'
}

export function useRitualDragShortcutHandlers(options: {
  ritualDrag: RitualDragContextValue | null
  spawnNeekoAtPointer: (clientX: number, clientY: number) => void
}) {
  const { registerShortcutHandlers } = useShortcutScope()
  const ritualDragRef = useRef(options.ritualDrag)
  const spawnRef = useRef(options.spawnNeekoAtPointer)
  ritualDragRef.current = options.ritualDrag
  spawnRef.current = options.spawnNeekoAtPointer

  useEffect(() => {
    const spawnHandler = (event: KeyboardEvent) => {
      if (!isCtrlRitualKey(event)) {
        return false
      }
      if (event.type === 'keydown' && event.repeat) {
        return false
      }
      const drag = ritualDragRef.current
      if (!drag || drag.phase !== 'dragging') {
        return false
      }
      spawnRef.current(drag.pointer.x, drag.pointer.y)
      return true
    }

    return registerShortcutHandlers({
      'ritual-ctrl-spawn': spawnHandler,
      'ritual-meta-spawn': spawnHandler,
    })
  }, [registerShortcutHandlers])
}
