import styles from './CanvasToolbarDockBodies.module.css'

type CanvasZoomDockBodyProps = {
  scale: number
  minScale: number
  maxScale: number
  onZoomIn: () => void
  onZoomOut: () => void
}

export function CanvasZoomDockBody({
  scale,
  minScale,
  maxScale,
  onZoomIn,
  onZoomOut,
}: CanvasZoomDockBodyProps) {
  return (
    <div className={styles.body} onPointerDown={(event) => event.stopPropagation()}>
      <div className={styles.zoomRow}>
        <button
          aria-label="Diminuir zoom"
          className={styles.zoomButton}
          disabled={scale <= minScale}
          onClick={onZoomOut}
          type="button"
        >
          −
        </button>
        <span className={styles.zoomValue}>{Math.round(scale * 100)}%</span>
        <button
          aria-label="Aumentar zoom"
          className={styles.zoomButton}
          disabled={scale >= maxScale}
          onClick={onZoomIn}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}
