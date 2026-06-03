import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  resolveVfxIsolationTarget,
  type VfxWindowIsolationState,
  type VfxWindowIsolationTarget,
} from '@/core/vfx/vfxWindowIsolation'

type UseVfxWindowIsolationOptions = {
  dockOpen: boolean
  shellRef: RefObject<HTMLElement | null>
  workspaceRef: RefObject<HTMLElement | null>
  timelineRef: RefObject<HTMLElement | null>
}

type PointerPosition = {
  clientX: number
  clientY: number
}

export function useVfxWindowIsolation({
  dockOpen,
  shellRef,
  workspaceRef,
  timelineRef,
}: UseVfxWindowIsolationOptions) {
  const [isolation, setIsolation] = useState<VfxWindowIsolationState>(null)
  const pointerRef = useRef<PointerPosition | null>(null)

  const resolveTargetFromPointer = useCallback((): VfxWindowIsolationTarget => {
    const pointer = pointerRef.current
    const clientX = pointer?.clientX ?? 0
    const clientY = pointer?.clientY ?? 0

    return resolveVfxIsolationTarget({
      clientX,
      clientY,
      shellEl: shellRef.current,
      workspaceEl: workspaceRef.current,
      timelineEl: timelineRef.current,
      activeElement: document.activeElement,
    })
  }, [shellRef, timelineRef, workspaceRef])

  const exitIsolation = useCallback(() => {
    setIsolation(null)
  }, [])

  const toggleIsolation = useCallback(() => {
    setIsolation((current) => {
      if (current !== null) {
        return null
      }
      return resolveTargetFromPointer()
    })
  }, [resolveTargetFromPointer])

  useEffect(() => {
    if (dockOpen) {
      return undefined
    }
    setIsolation(null)
  }, [dockOpen])

  useEffect(() => {
    if (!dockOpen) {
      return undefined
    }

    const trackPointer = (event: PointerEvent) => {
      const shell = shellRef.current
      if (!shell) {
        return
      }

      const rect = shell.getBoundingClientRect()
      const insideShell =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (insideShell) {
        pointerRef.current = { clientX: event.clientX, clientY: event.clientY }
      }
    }

    document.addEventListener('pointermove', trackPointer, { passive: true })
    document.addEventListener('pointerdown', trackPointer, { capture: true })

    return () => {
      document.removeEventListener('pointermove', trackPointer)
      document.removeEventListener('pointerdown', trackPointer, { capture: true })
    }
  }, [dockOpen, shellRef])

  return {
    isolation,
    exitIsolation,
    toggleIsolation,
  }
}
