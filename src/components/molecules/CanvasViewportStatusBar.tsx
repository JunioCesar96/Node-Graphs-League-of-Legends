import type { CanvasPosition } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CanvasViewportStatusBar.module.css'

type CanvasViewportStatusBarProps = {
  pan: CanvasPosition
  scale: number
  visibleNodeCount: number
  totalNodeCount: number
  selectedNodeCount: number
}

function formatZoomPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`
}

export function CanvasViewportStatusBar({
  pan,
  scale,
  visibleNodeCount,
  totalNodeCount,
  selectedNodeCount,
}: CanvasViewportStatusBarProps) {
  const { t } = useLanguage()
  const showingSelection = selectedNodeCount > 0

  return (
    <aside
      aria-label={t(LangId.CanvasViewportStatusAria)}
      className={styles.strip}
    >
      <span className={styles.item} title={t(LangId.CanvasViewportStatusCamera)}>
        {t(LangId.CanvasViewportStatusCamera, undefined, {
          x: Math.round(pan.x),
          y: Math.round(pan.y),
        })}
      </span>
      <span aria-hidden className={styles.separator}>
        ·
      </span>
      <span className={styles.item} title={t(LangId.CanvasViewportStatusZoom)}>
        {t(LangId.CanvasViewportStatusZoom, undefined, {
          percent: formatZoomPercent(scale),
        })}
      </span>
      <span aria-hidden className={styles.separator}>
        ·
      </span>
      <span
        className={styles.item}
        title={
          showingSelection
            ? t(LangId.CanvasViewportStatusSelectedNodes, undefined, {
                count: String(selectedNodeCount),
              })
            : t(LangId.CanvasViewportStatusNodes)
        }
      >
        {showingSelection
          ? t(LangId.CanvasViewportStatusSelectedNodes, undefined, {
              count: String(selectedNodeCount),
            })
          : t(LangId.CanvasViewportStatusNodes, undefined, {
              visible: String(visibleNodeCount),
              total: String(totalNodeCount),
            })}
      </span>
    </aside>
  )
}
