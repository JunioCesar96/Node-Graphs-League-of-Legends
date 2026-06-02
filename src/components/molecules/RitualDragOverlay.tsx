import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

import neekoEmojiUrl from '@/assets/neeko_emoji.png'
import { useRitualDrag } from '@/ritualDrag/RitualDragContext'

import styles from './RitualDragOverlay.module.css'

type NeekoSpeechBubbleProps = {
  x: number
  y: number
  children: ReactNode
}

function NeekoSpeechBubble({ x, y, children }: NeekoSpeechBubbleProps) {
  return (
    <div className={styles.speechBubbleAnchor} style={{ left: x, top: y }}>
      <div className={styles.speechBubbleRow}>
        <img className={styles.neekoEmoji} src={neekoEmojiUrl} alt="" draggable={false} />
        <div className={styles.speechBubble}>
          <p className={styles.speechBubbleText}>{children}</p>
        </div>
      </div>
      <div aria-hidden className={styles.speechBubbleTail} />
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg
      className={styles.ghostIcon}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 1.5h5.2L12.5 4.5V13.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 1.5V4.5H12.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 7.5h5M5.5 10h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M7.5 12.5l5-5M8.5 7.5h-2a2.5 2.5 0 1 0 0 5h2M11.5 12.5h2a2.5 2.5 0 1 0 0-5h-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DragMoveIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M10 3v14M3 10h14M6 6l4-4 4 4M14 14l-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RitualDragOverlay() {
  const ritualDrag = useRitualDrag()

  if (ritualDrag.phase === 'idle') {
    return null
  }

  const { x, y } = ritualDrag.pointer

  return createPortal(
    <div className={styles.overlay} aria-hidden>
      {ritualDrag.phase === 'hint' ? (
        <div className={styles.hint} style={{ left: x, top: y }}>
          Ctrl+arrasto · Neeko
        </div>
      ) : null}
      {ritualDrag.phase === 'hintLink' ? (
        <div className={styles.hint} style={{ left: x, top: y }}>
          Shift+arrasto · Vincular área
        </div>
      ) : null}
      {ritualDrag.phase === 'hintCtrl' ? (
        <div className={styles.dragHintIcon} style={{ left: x, top: y }}>
          <DragMoveIcon />
        </div>
      ) : null}
      {ritualDrag.phase === 'dragging' ? (
        <>
          <div className={styles.ghost} style={{ left: x + 18, top: y - 10 }}>
            <DocumentIcon />
          </div>
          <NeekoSpeechBubble x={x} y={y}>
            Na grade: pressione ou solte Ctrl para criar Neeko node
          </NeekoSpeechBubble>
        </>
      ) : null}
      {ritualDrag.phase === 'linkDragging' ? (
        <>
          <div className={styles.dragHintIcon} style={{ left: x, top: y }}>
            <LinkIcon />
          </div>
          <div className={styles.buildMessage} style={{ left: x, top: y + 28 }}>
            Solte no nó para vincular esta área do código
          </div>
        </>
      ) : null}
      {ritualDrag.phase === 'readyNeeko' ? (
        <div className={styles.buildMessage} style={{ left: x, top: y }}>
          Solte para aplicar o ritual
        </div>
      ) : null}
      {ritualDrag.phase === 'buildingNeeko' ? (
        <>
          <div className={styles.buildProgressWrap} style={{ left: x, top: y }}>
            <div className={styles.buildProgressTrack}>
              <div
                className={styles.buildProgressFill}
                style={{
                  width: `${String(Math.round((ritualDrag.neekoStaging?.buildProgress ?? 0) * 100))}%`,
                }}
              />
            </div>
          </div>
          <div className={styles.buildMessage} style={{ left: x, top: y }}>
            Espere construir neeko node
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
