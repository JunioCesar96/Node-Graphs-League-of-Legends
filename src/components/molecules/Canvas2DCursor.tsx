import type { CanvasPosition } from '@/core/canvasScene'

import styles from './Canvas2DCursor.module.css'

const CURSOR_SIZE = 48
const CURSOR_CENTER = CURSOR_SIZE / 2
const CURSOR_RING_RADIUS = 10

type Canvas2DCursorProps = {
  position: CanvasPosition
}

export function Canvas2DCursor({ position }: Canvas2DCursorProps) {
  return (
    <div
      aria-hidden
      className={styles.root}
      style={{
        left: position.x - CURSOR_CENTER,
        top: position.y - CURSOR_CENTER,
      }}
    >
      <svg
        className={styles.svg}
        height={CURSOR_SIZE}
        role="presentation"
        viewBox={`0 0 ${CURSOR_SIZE} ${CURSOR_SIZE}`}
        width={CURSOR_SIZE}
      >
        <line
          className={styles.crosshair}
          x1={CURSOR_CENTER}
          x2={CURSOR_CENTER}
          y1={0}
          y2={CURSOR_SIZE}
        />
        <line
          className={styles.crosshair}
          x1={0}
          x2={CURSOR_SIZE}
          y1={CURSOR_CENTER}
          y2={CURSOR_CENTER}
        />
        <circle
          className={styles.ringBase}
          cx={CURSOR_CENTER}
          cy={CURSOR_CENTER}
          r={CURSOR_RING_RADIUS}
        />
        <circle
          className={styles.ringAccent}
          cx={CURSOR_CENTER}
          cy={CURSOR_CENTER}
          r={CURSOR_RING_RADIUS}
        />
      </svg>
    </div>
  )
}
