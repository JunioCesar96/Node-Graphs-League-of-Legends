import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { CanvasPosition } from '@/core/canvasScene'

import styles from '@/components/molecules/SceneCameraPanel.module.css'

function parseCameraChannel(raw: string): number | null {
  const parsed = Number.parseFloat(raw.trim())

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed)
}

type SceneCameraPanelProps = {
  pan: CanvasPosition
  onPanChange: (pan: CanvasPosition) => void
}

export function SceneCameraPanel({ pan, onPanChange }: SceneCameraPanelProps) {
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
    <div
      className={styles.panel}
      data-canvas-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className={styles.label}>camera</span>
      <div className={styles.fields}>
        <label className={styles.field}>
          <input
            aria-label="Câmera X"
            inputMode="numeric"
            onBlur={commitDraft}
            onChange={(event) => setDraftX(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            type="number"
            value={draftX}
          />
          <span>X</span>
        </label>
        <label className={styles.field}>
          <input
            aria-label="Câmera Y"
            inputMode="numeric"
            onBlur={commitDraft}
            onChange={(event) => setDraftY(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            type="number"
            value={draftY}
          />
          <span>Y</span>
        </label>
      </div>
    </div>
  )
}
