import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

const SCROLL_CONTROL_DEAD_ZONE = 8
const MAX_SCROLL_SPEED = 28

export type ListScrollDirection = 'down' | 'idle' | 'up'

export function useCustomListScrollControl(active: boolean) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const scrollVelocityRef = useRef(0)

  const [isScrollActive, setIsScrollActive] = useState(false)
  const [scrollDirection, setScrollDirection] = useState<ListScrollDirection>('idle')
  const [scrollIntensity, setScrollIntensity] = useState(0)

  useEffect(() => {
    if (!active) {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current)
        scrollFrameRef.current = null
      }
      scrollVelocityRef.current = 0
      return
    }

    const scrollList = () => {
      if (listRef.current && scrollVelocityRef.current !== 0) {
        listRef.current.scrollTop += scrollVelocityRef.current
      }
      scrollFrameRef.current = window.requestAnimationFrame(scrollList)
    }

    scrollFrameRef.current = window.requestAnimationFrame(scrollList)

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current)
      }
      scrollFrameRef.current = null
      scrollVelocityRef.current = 0
    }
  }, [active])

  const updateScrollIntent = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const controlBounds = event.currentTarget.getBoundingClientRect()
    const centerY = controlBounds.top + controlBounds.height / 2
    const distanceFromCenter = event.clientY - centerY
    const absoluteDistance = Math.abs(distanceFromCenter)

    if (absoluteDistance < SCROLL_CONTROL_DEAD_ZONE) {
      scrollVelocityRef.current = 0
      setScrollDirection('idle')
      setScrollIntensity(0)
      return
    }

    const direction = distanceFromCenter > 0 ? 'down' : 'up'
    const intensity = Math.min(1, (absoluteDistance - SCROLL_CONTROL_DEAD_ZONE) / 90)

    scrollVelocityRef.current =
      (direction === 'down' ? 1 : -1) * Math.max(2, intensity * MAX_SCROLL_SPEED)
    setScrollDirection(direction)
    setScrollIntensity(intensity)
  }, [])

  const startScroll = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return
      }

      setIsScrollActive(true)
      updateScrollIntent(event)
      event.currentTarget.setPointerCapture(event.pointerId)
      event.stopPropagation()
    },
    [updateScrollIntent],
  )

  const moveScroll = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isScrollActive) {
        return
      }

      updateScrollIntent(event)
      event.stopPropagation()
    },
    [isScrollActive, updateScrollIntent],
  )

  const stopScroll = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    scrollVelocityRef.current = 0
    setIsScrollActive(false)
    setScrollDirection('idle')
    setScrollIntensity(0)
    event.stopPropagation()
  }, [])

  const scrollControlStyle = {
    '--scroll-duration': `${String(Math.max(180, 720 - scrollIntensity * 520))}ms`,
    '--scroll-glow': `${String(8 + scrollIntensity * 18)}px`,
    '--scroll-intensity': scrollIntensity.toString(),
    '--scroll-shift': `${String(2 + scrollIntensity * 5)}px`,
    '--scroll-shift-negative': `${String(-(2 + scrollIntensity * 5))}px`,
  } as CSSProperties & Record<`--${string}`, string>

  return {
    listRef,
    isScrollActive,
    scrollDirection,
    scrollIntensity,
    startScroll,
    moveScroll,
    stopScroll,
    scrollControlStyle,
  }
}
