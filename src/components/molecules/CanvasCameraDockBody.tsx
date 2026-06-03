import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type { CanvasPosition } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CanvasToolbarDockBodies.module.css'

function parseCameraChannel(raw: string): number | null {
  const parsed = Number.parseFloat(raw.trim())

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed)
}

type CanvasCameraDockBodyProps = {
  pan: CanvasPosition
  onPanChange: (pan: CanvasPosition) => void
  showResetViewport?: boolean
  showResetScene?: boolean
  onResetViewport?: () => void
  onResetScene?: () => void
}

export function CanvasCameraDockBody({
  pan,
  onPanChange,
  showResetViewport = false,
  showResetScene = false,
  onResetViewport,
  onResetScene,
}: CanvasCameraDockBodyProps) {
  const { t } = useLanguage()
  const [draftX, setDraftX] = useState(String(pan.x))
  const [draftY, setDraftY] = useState(String(pan.y))
  const lastSyncedPanRef = useRef({ x: pan.x, y: pan.y })

  useEffect(() => {
    if (lastSyncedPanRef.current.x === pan.x && lastSyncedPanRef.current.y === pan.y) {
      return
    }

    lastSyncedPanRef.current = { x: pan.x, y: pan.y }
    const nextX = String(pan.x)
    const nextY = String(pan.y)

    setDraftX((current) => (current === nextX ? current : nextX))
    setDraftY((current) => (current === nextY ? current : nextY))
  }, [pan.x, pan.y])

  const commitDraft = () => {
    const x = parseCameraChannel(draftX)
    const y = parseCameraChannel(draftY)

    if (x === null || y === null) {
      setDraftX(String(pan.x))
      setDraftY(String(pan.y))
      return
    }

    if (x === pan.x && y === pan.y) {
      return
    }

    onPanChange({ x, y })
  }

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitDraft()
      event.currentTarget.blur()
    }
  }

  return (
    <div className={styles.body} onPointerDown={(event) => event.stopPropagation()}>
      <div className={styles.cameraFields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>X</span>
          <input
            aria-label="Câmera X"
            className={styles.fieldInput}
            inputMode="numeric"
            onBlur={commitDraft}
            onChange={(event) => setDraftX(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            type="number"
            value={draftX}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Y</span>
          <input
            aria-label="Câmera Y"
            className={styles.fieldInput}
            inputMode="numeric"
            onBlur={commitDraft}
            onChange={(event) => setDraftY(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            type="number"
            value={draftY}
          />
        </label>
      </div>
      {showResetViewport || showResetScene ? (
        <div className={styles.resetActions}>
          {showResetViewport && onResetViewport ? (
            <button className={styles.actionButton} onClick={onResetViewport} type="button">
              {t(LangId.GraphToolbarResetViewport)}
            </button>
          ) : null}
          {showResetScene && onResetScene ? (
            <button
              className={[styles.actionButton, styles.actionButtonDanger].join(' ')}
              onClick={onResetScene}
              type="button"
            >
              {t(LangId.GraphToolbarResetScene)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
