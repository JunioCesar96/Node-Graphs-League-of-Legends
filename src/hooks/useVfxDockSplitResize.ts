import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

import {
  clampVfxDockTimelineHeight,
  resolveDefaultVfxDockTimelineHeight,
  VFX_DOCK_FALLBACK_TRANSPORT_MIN_HEIGHT,
} from '@/core/vfx/vfxDockSplitLayout'
import {
  loadVfxDockTimelineHeight,
  saveVfxDockTimelineHeight,
} from '@/core/vfx/vfxDockSplitPreferences'

type SplitDragPhase = {
  startY: number
  startTimelineHeight: number
}

export function useVfxDockSplitResize(options: {
  enabled: boolean
  splitRef: RefObject<HTMLElement | null>
  transportRef: RefObject<HTMLElement | null>
}) {
  const [timelineHeight, setTimelineHeight] = useState(VFX_DOCK_FALLBACK_TRANSPORT_MIN_HEIGHT + 140)
  const [transportMinHeight, setTransportMinHeight] = useState(VFX_DOCK_FALLBACK_TRANSPORT_MIN_HEIGHT)
  const dragPhaseRef = useRef<SplitDragPhase | null>(null)
  const initializedRef = useRef(false)

  const clampToSplit = useCallback(
    (requestedHeight: number) => {
      const splitEl = options.splitRef.current
      const splitHeight = splitEl?.clientHeight ?? 0
      if (splitHeight <= 0) {
        return requestedHeight
      }

      return clampVfxDockTimelineHeight({
        requestedHeight,
        splitHeight,
        minTimelineHeight: transportMinHeight,
      })
    },
    [options.splitRef, transportMinHeight],
  )

  useEffect(() => {
    const transportEl = options.transportRef.current
    if (!transportEl) {
      return undefined
    }

    const measure = () => {
      const nextMin = Math.ceil(transportEl.getBoundingClientRect().height)
      if (nextMin > 0) {
        setTransportMinHeight(nextMin)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(transportEl)
    return () => observer.disconnect()
  }, [options.transportRef, options.enabled])

  useEffect(() => {
    if (!options.enabled || initializedRef.current) {
      return undefined
    }

    const splitEl = options.splitRef.current
    if (!splitEl) {
      return undefined
    }

    const applyInitial = () => {
      const splitHeight = splitEl.clientHeight
      if (splitHeight <= 0) {
        return
      }

      const stored = loadVfxDockTimelineHeight()
      const nextHeight =
        stored !== null
          ? clampVfxDockTimelineHeight({
              requestedHeight: stored,
              splitHeight,
              minTimelineHeight: transportMinHeight,
            })
          : resolveDefaultVfxDockTimelineHeight(splitHeight, transportMinHeight)

      setTimelineHeight(nextHeight)
      initializedRef.current = true
    }

    applyInitial()
    const observer = new ResizeObserver(() => {
      if (!initializedRef.current) {
        applyInitial()
        return
      }

      setTimelineHeight((current) => clampToSplit(current))
    })
    observer.observe(splitEl)
    return () => observer.disconnect()
  }, [clampToSplit, options.enabled, options.splitRef, transportMinHeight])

  useEffect(() => {
    if (!options.enabled) {
      return undefined
    }

    setTimelineHeight((current) => clampToSplit(current))
  }, [clampToSplit, options.enabled, transportMinHeight])

  const onSplitPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!options.enabled || event.button !== 0) {
        return
      }

      event.preventDefault()
      dragPhaseRef.current = {
        startY: event.clientY,
        startTimelineHeight: timelineHeight,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [options.enabled, timelineHeight],
  )

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const phase = dragPhaseRef.current
      if (!phase) {
        return
      }

      const deltaY = event.clientY - phase.startY
      // Timeline ancorada embaixo: arrastar a divisória para baixo reduz a altura da timeline.
      setTimelineHeight(clampToSplit(phase.startTimelineHeight - deltaY))
    }

    const stop = () => {
      if (!dragPhaseRef.current) {
        return
      }

      dragPhaseRef.current = null
      setTimelineHeight((current) => {
        const clamped = clampToSplit(current)
        saveVfxDockTimelineHeight(clamped)
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
  }, [clampToSplit])

  return {
    timelineHeight,
    transportMinHeight,
    onSplitPointerDown,
  }
}
