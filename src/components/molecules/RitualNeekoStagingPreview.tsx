import { useRitualDragOptional } from '@/ritualDrag/RitualDragContext'

import styles from './RitualNeekoStagingPreview.module.css'

export function RitualNeekoStagingPreview() {
  const ritualDrag = useRitualDragOptional()

  if (
    !ritualDrag?.neekoStaging ||
    (ritualDrag.phase !== 'buildingNeeko' && ritualDrag.phase !== 'readyNeeko')
  ) {
    return null
  }

  const { canvasPosition, buildProgress } = ritualDrag.neekoStaging
  const opacity = Math.min(1, Math.max(0.08, buildProgress))

  return (
    <div
      className={styles.preview}
      style={{
        left: canvasPosition.x,
        top: canvasPosition.y,
        opacity,
      }}
      aria-hidden
    >
      <div className={styles.previewInner}>
        <span className={styles.previewTitle}>Neeko Node</span>
        <span className={styles.previewHint}>A construir…</span>
      </div>
    </div>
  )
}
