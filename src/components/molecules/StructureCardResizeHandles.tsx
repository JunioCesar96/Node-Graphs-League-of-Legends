import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { clampStructureCardWidth } from '@/core/structureCardLayout'

import styles from './StructureCardResizeHandles.module.css'

type StructureCardResizeHandlesProps = {
  minWidth: number
  maxWidth: number
  width: number
  startPositionX: number
  scale: number
  resizeModifierActive: boolean
  disabled?: boolean
  onResize: (payload: { width: number; positionX: number }) => void
}

type ResizeGesture = {
  edge: 'left' | 'right'
  originClientX: number
  startWidth: number
  startPositionX: number
  pointerId: number
}

export function StructureCardResizeHandles({
  minWidth,
  maxWidth,
  width,
  startPositionX,
  scale,
  resizeModifierActive,
  disabled = false,
  onResize,
}: StructureCardResizeHandlesProps) {
  const gestureRef = useRef<ResizeGesture | null>(null)
  const [resizeActive, setResizeActive] = useState(false)
  const handleVisible = resizeModifierActive || resizeActive

  const finishGesture = useCallback((pointerId: number) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== pointerId) {
      return
    }
    gestureRef.current = null
    setResizeActive(false)
  }, [])

  const beginGesture = useCallback(
    (edge: 'left' | 'right', event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button !== 0) {
        return
      }
      if (!event.ctrlKey && !event.metaKey && !resizeModifierActive) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      gestureRef.current = {
        edge,
        originClientX: event.clientX,
        pointerId: event.pointerId,
        startPositionX,
        startWidth: width,
      }
      setResizeActive(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [disabled, resizeModifierActive, startPositionX, width],
  )

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) {
        return
      }

      const deltaCanvas = (event.clientX - gesture.originClientX) / scale
      let nextWidth = gesture.startWidth
      let positionX = gesture.startPositionX

      if (gesture.edge === 'right') {
        nextWidth = clampStructureCardWidth(gesture.startWidth + deltaCanvas, minWidth)
        nextWidth = Math.min(maxWidth, nextWidth)
      } else {
        nextWidth = clampStructureCardWidth(gesture.startWidth - deltaCanvas, minWidth)
        nextWidth = Math.min(maxWidth, nextWidth)
        positionX = gesture.startPositionX + (gesture.startWidth - nextWidth)
      }

      onResize({ width: nextWidth, positionX })
    }

    const onPointerUp = (event: PointerEvent) => {
      finishGesture(event.pointerId)
    }

    const onPointerCancel = (event: PointerEvent) => {
      finishGesture(event.pointerId)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [finishGesture, maxWidth, minWidth, onResize, scale])

  if (disabled) {
    return null
  }

  return (
    <>
      <button
        type="button"
        aria-label="Redimensionar largura do card (borda esquerda)"
        className={[styles.handle, styles.handleLeft, handleVisible ? styles.handleVisible : '']
          .filter(Boolean)
          .join(' ')}
        data-structure-card-resize="left"
        tabIndex={-1}
        onPointerDown={(event) => beginGesture('left', event)}
      />
      <button
        type="button"
        aria-label="Redimensionar largura do card (borda direita)"
        className={[styles.handle, styles.handleRight, handleVisible ? styles.handleVisible : '']
          .filter(Boolean)
          .join(' ')}
        data-structure-card-resize="right"
        tabIndex={-1}
        onPointerDown={(event) => beginGesture('right', event)}
      />
    </>
  )
}
