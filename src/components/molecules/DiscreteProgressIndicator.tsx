import { useCallback, useMemo, useRef } from 'react'

import {
  patchDiscreteProgress,
  storeDiscreteProgressPosition,
  type DiscreteProgressEntry,
} from '@/core/ui/discreteProgressStore'
import { getDiscreteProgressHandlers } from '@/core/ui/discreteProgressHandlers'

import styles from './DiscreteProgressIndicator.module.css'

const DOT_COUNT = 24
const RING_RADIUS = 38

type DiscreteProgressIndicatorProps = {
  entry: DiscreteProgressEntry
  stackIndex: number
}

export function DiscreteProgressIndicator({ entry, stackIndex }: DiscreteProgressIndicatorProps) {
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const percent = useMemo(() => {
    const safeTotal = Math.max(entry.total, 1)
    return Math.round((Math.min(Math.max(entry.completed, 0), safeTotal) / safeTotal) * 100)
  }, [entry.completed, entry.total])

  const activeDots = useMemo(() => {
    return Math.round((percent / 100) * DOT_COUNT)
  }, [percent])

  const dots = useMemo(() => {
    return Array.from({ length: DOT_COUNT }, (_, index) => {
      const angle = (index / DOT_COUNT) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * RING_RADIUS
      const y = Math.sin(angle) * RING_RADIUS
      return {
        index,
        x,
        y,
        active: index < activeDots,
      }
    })
  }, [activeDots])

  const onDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: entry.position.x,
        originY: entry.position.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [entry.position.x, entry.position.y],
  )

  const onDragPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const nextPosition = {
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    }
    patchDiscreteProgress(entry.name, { position: nextPosition })
  }, [entry.name])

  const onDragPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }
      const nextPosition = {
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
      }
      dragStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      patchDiscreteProgress(entry.name, { position: nextPosition })
      storeDiscreteProgressPosition(entry.name, nextPosition)
    },
    [entry.name],
  )

  const handlers = getDiscreteProgressHandlers(entry.name)

  return (
    <div
      className={`${styles.discreteProgress} codeDockJadeScope`}
      style={{
        right: `${String(16 - entry.position.x)}px`,
        bottom: `${String(16 + stackIndex * 156 - entry.position.y)}px`,
      }}
    >
      {entry.phase === 'running' && handlers?.onCancelRequest ? (
        <button
          aria-label="Cancelar"
          className={styles.cancelButton}
          onClick={handlers.onCancelRequest}
          type="button"
        >
          ×
        </button>
      ) : null}

      <div
        className={styles.dragHandle}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
      >
        <span className={styles.dragGrip} />
      </div>

      {entry.phase === 'running' ? (
        <>
          <div className={styles.ringWrap}>
            <div className={styles.dotRing}>
              {dots.map((dot) => (
                <span
                  className={`${styles.dot} ${dot.active ? styles.dotActive : ''}`}
                  key={dot.index}
                  style={{
                    transform: `translate(${String(dot.x)}px, ${String(dot.y)}px)${dot.active ? ' scale(1.08)' : ''}`,
                  }}
                />
              ))}
            </div>
            <div
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percent}
              aria-live="polite"
              className={styles.percentWrap}
              role="progressbar"
            >
              {percent}
              <span className={styles.percentSymbol}>%</span>
            </div>
          </div>
          <p className={styles.label}>{entry.label}</p>
          {entry.detailLabel ? <p className={styles.detail}>{entry.detailLabel}</p> : null}
        </>
      ) : null}

      {entry.phase === 'confirm' && entry.confirm ? (
        <div className={styles.panel}>
          <p className={styles.label}>{entry.label}</p>
          <p className={styles.message}>{entry.confirm.message}</p>
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={handlers?.onConfirmNo}
              type="button"
            >
              {entry.confirm.noLabel}
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionPrimary}`}
              onClick={handlers?.onConfirmYes}
              type="button"
            >
              {entry.confirm.yesLabel}
            </button>
          </div>
        </div>
      ) : null}

      {entry.phase === 'summary' ? (
        <div className={styles.panel}>
          <p className={styles.label}>{entry.label}</p>
          {entry.summaryBody ? <p className={styles.summaryBody}>{entry.summaryBody}</p> : null}
          <div className={styles.actions}>
            <button className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={handlers?.onDismiss} type="button">
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
