import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { CanvasPosition } from '@/core/canvasScene'

export type RitualDragPhase =
  | 'idle'
  | 'hint'
  | 'hintCtrl'
  | 'dragging'
  | 'buildingNeeko'
  | 'readyNeeko'

export type RitualDragPointer = {
  x: number
  y: number
}

export type NeekoStagingState = {
  canvasPosition: CanvasPosition
  buildProgress: number
  canvasNodeId: string | null
}

export type RitualDragSession = {
  phase: RitualDragPhase
  text: string
  pointer: RitualDragPointer
  hoveredNeekoCanvasNodeId: string | null
  neekoStaging: NeekoStagingState | null
}

type RitualDragContextValue = RitualDragSession & {
  showHint: (pointer: RitualDragPointer) => void
  showHintCtrl: (pointer: RitualDragPointer) => void
  hideHint: () => void
  startDrag: (text: string, pointer: RitualDragPointer) => void
  updatePointer: (pointer: RitualDragPointer) => void
  setHoveredNeeko: (canvasNodeId: string | null) => void
  beginNeekoStaging: (canvasPosition: CanvasPosition, pointer: RitualDragPointer) => void
  setNeekoStagingProgress: (progress: number) => void
  completeNeekoStaging: (canvasNodeId: string) => void
  /** Neeko já criado na grade (sem animação de build); pronto para soltar o ritual. */
  placeNeekoReady: (
    canvasPosition: CanvasPosition,
    canvasNodeId: string,
    pointer: RitualDragPointer,
  ) => void
  cancelNeekoStaging: () => void
  cancel: () => void
  consumeDrop: () => string | null
  failBuildAndConsumeText: () => string | null
}

const IDLE_SESSION: RitualDragSession = {
  phase: 'idle',
  text: '',
  pointer: { x: 0, y: 0 },
  hoveredNeekoCanvasNodeId: null,
  neekoStaging: null,
}

const RitualDragContext = createContext<RitualDragContextValue | null>(null)

export function useRitualDrag(): RitualDragContextValue {
  const ctx = useContext(RitualDragContext)
  if (!ctx) {
    throw new Error('useRitualDrag deve ser usado dentro de RitualDragProvider')
  }
  return ctx
}

export function useRitualDragOptional(): RitualDragContextValue | null {
  return useContext(RitualDragContext)
}

export function RitualDragProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<RitualDragSession>(IDLE_SESSION)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const showHint = useCallback((pointer: RitualDragPointer) => {
    setSession((prev) => {
      if (prev.phase === 'dragging' || prev.phase === 'buildingNeeko' || prev.phase === 'readyNeeko') {
        return prev
      }
      return {
        ...prev,
        phase: 'hint',
        pointer,
      }
    })
  }, [])

  const showHintCtrl = useCallback((pointer: RitualDragPointer) => {
    setSession((prev) => {
      if (prev.phase === 'dragging' || prev.phase === 'buildingNeeko' || prev.phase === 'readyNeeko') {
        return prev
      }
      return {
        ...prev,
        phase: 'hintCtrl',
        pointer,
      }
    })
  }, [])

  const hideHint = useCallback(() => {
    setSession((prev) =>
      prev.phase === 'hint' || prev.phase === 'hintCtrl' ? IDLE_SESSION : prev,
    )
  }, [])

  const startDrag = useCallback((text: string, pointer: RitualDragPointer) => {
    if (!text.trim()) {
      return
    }
    setSession({
      phase: 'dragging',
      text: text.trim(),
      pointer,
      hoveredNeekoCanvasNodeId: null,
      neekoStaging: null,
    })
  }, [])

  const updatePointer = useCallback((pointer: RitualDragPointer) => {
    setSession((prev) => {
      if (
        prev.phase !== 'hint' &&
        prev.phase !== 'hintCtrl' &&
        prev.phase !== 'dragging' &&
        prev.phase !== 'buildingNeeko' &&
        prev.phase !== 'readyNeeko'
      ) {
        return prev
      }
      return { ...prev, pointer }
    })
  }, [])

  const setHoveredNeeko = useCallback((canvasNodeId: string | null) => {
    setSession((prev) => {
      if (
        prev.phase !== 'dragging' &&
        prev.phase !== 'buildingNeeko' &&
        prev.phase !== 'readyNeeko'
      ) {
        return prev
      }
      if (prev.hoveredNeekoCanvasNodeId === canvasNodeId) {
        return prev
      }
      return { ...prev, hoveredNeekoCanvasNodeId: canvasNodeId }
    })
  }, [])

  const beginNeekoStaging = useCallback(
    (canvasPosition: CanvasPosition, pointer: RitualDragPointer) => {
      setSession((prev) => {
        if (prev.phase !== 'dragging' || !prev.text.trim()) {
          return prev
        }
        return {
          ...prev,
          phase: 'buildingNeeko',
          pointer,
          hoveredNeekoCanvasNodeId: null,
          neekoStaging: {
            canvasPosition,
            buildProgress: 0,
            canvasNodeId: null,
          },
        }
      })
    },
    [],
  )

  const setNeekoStagingProgress = useCallback((progress: number) => {
    const clamped = Math.min(1, Math.max(0, progress))
    setSession((prev) => {
      if (!prev.neekoStaging || (prev.phase !== 'buildingNeeko' && prev.phase !== 'readyNeeko')) {
        return prev
      }
      return {
        ...prev,
        neekoStaging: {
          ...prev.neekoStaging,
          buildProgress: clamped,
        },
      }
    })
  }, [])

  const completeNeekoStaging = useCallback((canvasNodeId: string) => {
    setSession((prev) => {
      if (!prev.neekoStaging) {
        return prev
      }
      return {
        ...prev,
        phase: 'readyNeeko',
        hoveredNeekoCanvasNodeId: canvasNodeId,
        neekoStaging: {
          ...prev.neekoStaging,
          buildProgress: 1,
          canvasNodeId,
        },
      }
    })
  }, [])

  const placeNeekoReady = useCallback(
    (canvasPosition: CanvasPosition, canvasNodeId: string, pointer: RitualDragPointer) => {
      setSession((prev) => {
        if (prev.phase !== 'dragging' || !prev.text.trim()) {
          return prev
        }
        return {
          ...prev,
          phase: 'readyNeeko',
          pointer,
          hoveredNeekoCanvasNodeId: canvasNodeId,
          neekoStaging: {
            canvasPosition,
            buildProgress: 1,
            canvasNodeId,
          },
        }
      })
    },
    [],
  )

  const cancelNeekoStaging = useCallback(() => {
    setSession((prev) => {
      if (prev.phase !== 'buildingNeeko' && prev.phase !== 'readyNeeko') {
        return prev
      }
      return {
        ...prev,
        phase: 'dragging',
        hoveredNeekoCanvasNodeId: null,
        neekoStaging: null,
      }
    })
  }, [])

  const cancel = useCallback(() => {
    setSession(IDLE_SESSION)
  }, [])

  const consumeDrop = useCallback(() => {
    const current = sessionRef.current
    if (!current.text.trim()) {
      setSession(IDLE_SESSION)
      return null
    }

    if (current.phase === 'readyNeeko' && current.neekoStaging?.canvasNodeId) {
      const text = current.text
      setSession(IDLE_SESSION)
      return text
    }

    if (current.phase === 'dragging') {
      const text = current.text
      setSession(IDLE_SESSION)
      return text
    }

    return null
  }, [])

  const failBuildAndConsumeText = useCallback(() => {
    const current = sessionRef.current
    const text = current.text.trim() ? current.text : null
    setSession(IDLE_SESSION)
    return text
  }, [])

  const value = useMemo<RitualDragContextValue>(
    () => ({
      ...session,
      showHint,
      showHintCtrl,
      hideHint,
      startDrag,
      updatePointer,
      setHoveredNeeko,
      beginNeekoStaging,
      setNeekoStagingProgress,
      completeNeekoStaging,
      placeNeekoReady,
      cancelNeekoStaging,
      cancel,
      consumeDrop,
      failBuildAndConsumeText,
    }),
    [
      session,
      showHint,
      showHintCtrl,
      hideHint,
      startDrag,
      updatePointer,
      setHoveredNeeko,
      beginNeekoStaging,
      setNeekoStagingProgress,
      completeNeekoStaging,
      placeNeekoReady,
      cancelNeekoStaging,
      cancel,
      consumeDrop,
      failBuildAndConsumeText,
    ],
  )

  return <RitualDragContext.Provider value={value}>{children}</RitualDragContext.Provider>
}
