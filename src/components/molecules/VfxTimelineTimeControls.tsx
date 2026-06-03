import { useEffect, useRef, useState } from 'react'

import { LangId } from '@/core/language/languageIds'
import type { VfxPlaybackRange } from '@/core/vfx/vfxPlaybackRange'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxTimelineTimeControls.module.css'

type VfxTimelineTimeControlsProps = {
  currentTime: number
  lifetime: number
  playbackRange: VfxPlaybackRange
  resetPointTime: number | null
  onScrub: (time: number) => void
  onSetPlaybackRangeStart: (time: number) => void
  onSetPlaybackRangeEnd: (time: number) => void
}

function formatCompactTime(seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return String(Math.round(rounded))
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

function parseTimeInput(value: string): number | null {
  const trimmed = value.trim().replace(/s$/i, '')
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

export function VfxTimelineTimeControls({
  currentTime,
  lifetime,
  playbackRange,
  resetPointTime,
  onScrub,
  onSetPlaybackRangeStart,
  onSetPlaybackRangeEnd,
}: VfxTimelineTimeControlsProps) {
  const { t } = useLanguage()
  const [editingCurrent, setEditingCurrent] = useState(false)
  const [editingStart, setEditingStart] = useState(false)
  const [editingEnd, setEditingEnd] = useState(false)
  const [currentDraft, setCurrentDraft] = useState('')
  const [startDraft, setStartDraft] = useState('')
  const [endDraft, setEndDraft] = useState('')
  const currentInputRef = useRef<HTMLInputElement>(null)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

  const displayStart = playbackRange.start
  const displayEnd = playbackRange.end > 0 ? playbackRange.end : lifetime

  useEffect(() => {
    if (editingCurrent) {
      currentInputRef.current?.focus()
      currentInputRef.current?.select()
    }
  }, [editingCurrent])

  useEffect(() => {
    if (editingStart) {
      startInputRef.current?.focus()
      startInputRef.current?.select()
    }
  }, [editingStart])

  useEffect(() => {
    if (editingEnd) {
      endInputRef.current?.focus()
      endInputRef.current?.select()
    }
  }, [editingEnd])

  const commitCurrent = () => {
    const parsed = parseTimeInput(currentDraft)
    if (parsed !== null) {
      onScrub(Math.min(Math.max(parsed, 0), lifetime))
    }
    setEditingCurrent(false)
  }

  const commitStart = () => {
    const parsed = parseTimeInput(startDraft)
    if (parsed !== null) {
      onSetPlaybackRangeStart(parsed)
    }
    setEditingStart(false)
  }

  const commitEnd = () => {
    const parsed = parseTimeInput(endDraft)
    if (parsed !== null) {
      onSetPlaybackRangeEnd(parsed)
    }
    setEditingEnd(false)
  }

  const beginEditCurrent = () => {
    if (editingStart) commitStart()
    if (editingEnd) commitEnd()
    setCurrentDraft(formatCompactTime(currentTime))
    setEditingCurrent(true)
    setEditingStart(false)
    setEditingEnd(false)
  }

  const beginEditStart = () => {
    if (editingCurrent) commitCurrent()
    if (editingEnd) commitEnd()
    setStartDraft(formatCompactTime(displayStart))
    setEditingStart(true)
    setEditingCurrent(false)
    setEditingEnd(false)
  }

  const beginEditEnd = () => {
    if (editingCurrent) commitCurrent()
    if (editingStart) commitStart()
    setEndDraft(formatCompactTime(displayEnd))
    setEditingEnd(true)
    setEditingCurrent(false)
    setEditingStart(false)
  }

  return (
    <div className={styles.timeControls}>
      <div className={styles.currentPill}>
        {editingCurrent ? (
          <input
            aria-label={t(LangId.VfxTimelineEditTime)}
            className={styles.valueInput}
            onBlur={commitCurrent}
            onChange={(event) => setCurrentDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitCurrent()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                setEditingCurrent(false)
              }
            }}
            ref={currentInputRef}
            type="text"
            value={currentDraft}
          />
        ) : (
          <button
            className={styles.valueBtn}
            onClick={beginEditCurrent}
            title={t(LangId.VfxTimelineEditTime)}
            type="button"
          >
            {formatCompactTime(currentTime)}
          </button>
        )}
      </div>

      <div className={styles.rangeGroup}>
        <span aria-hidden className={styles.rangeIcon}>
          ⏱
        </span>
        <div className={styles.rangeSegment}>
          <span className={styles.rangeLabel}>{t(LangId.VfxTimelineRangeStartLabel)}</span>
          {editingStart ? (
            <input
              aria-label={t(LangId.VfxTimelineRangeStartLabel)}
              className={styles.valueInput}
              onBlur={commitStart}
              onChange={(event) => setStartDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitStart()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setEditingStart(false)
                }
              }}
              ref={startInputRef}
              type="text"
              value={startDraft}
            />
          ) : (
            <button className={styles.valueBtn} onClick={beginEditStart} type="button">
              {formatCompactTime(displayStart)}
            </button>
          )}
        </div>
        <div aria-hidden className={styles.rangeDivider} />
        <div className={styles.rangeSegment}>
          <span className={styles.rangeLabel}>{t(LangId.VfxTimelineRangeEndLabel)}</span>
          {editingEnd ? (
            <input
              aria-label={t(LangId.VfxTimelineRangeEndLabel)}
              className={styles.valueInput}
              onBlur={commitEnd}
              onChange={(event) => setEndDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitEnd()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setEditingEnd(false)
                }
              }}
              ref={endInputRef}
              type="text"
              value={endDraft}
            />
          ) : (
            <button className={styles.valueBtn} onClick={beginEditEnd} type="button">
              {formatCompactTime(displayEnd)}
            </button>
          )}
        </div>
      </div>

      {resetPointTime !== null ? (
        <span className={styles.resetHint} title="Reset point">
          ↺ {formatCompactTime(resetPointTime)}
        </span>
      ) : null}
    </div>
  )
}
