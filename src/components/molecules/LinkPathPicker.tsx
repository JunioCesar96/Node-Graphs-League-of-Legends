import { useCallback, useMemo, useState } from 'react'
import type { DragEvent } from 'react'

import { LinkCharacterCombobox } from '@/components/molecules/LinkCharacterCombobox'
import {
  applyCharacterRenameInPath,
  formatLinkPath,
  isCharacterSegmentIndex,
  LINK_NEW_SEGMENT_DEFAULT,
  normalizeLinkPath,
  parseLinkPath,
  reorderLinkSegments,
  segmentTagLabel,
} from '@/core/linkValue'

import styles from '@/components/molecules/LinkPathPicker.module.css'

type LinkPathPickerProps = {
  value: string
  onChange: (next: string) => void
  /** Sem chrome de modal — para painel lateral (ex. Map[hash,link]). */
  embedded?: boolean
}

export function LinkPathPicker({ value, onChange, embedded = false }: LinkPathPickerProps) {
  const segments = useMemo(() => parseLinkPath(value), [value])
  const fullPath = useMemo(() => formatLinkPath(segments), [segments])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const commitSegments = useCallback(
    (nextSegments: string[]) => {
      onChange(normalizeLinkPath(formatLinkPath(nextSegments)))
    },
    [onChange],
  )

  const updateSegment = (index: number, nextValue: string) => {
    const next = [...segments]
    next[index] = nextValue
    commitSegments(next)
  }

  const updateCharacterSegment = (index: number, nextValue: string) => {
    commitSegments(applyCharacterRenameInPath(segments, index, nextValue))
  }

  const addSegment = () => {
    commitSegments([...segments, LINK_NEW_SEGMENT_DEFAULT])
    setSelectedIndex(segments.length)
  }

  const removeSegment = () => {
    if (segments.length <= 1) {
      commitSegments([''])
      setSelectedIndex(0)
      return
    }
    const removeAt = selectedIndex >= 0 && selectedIndex < segments.length ? selectedIndex : segments.length - 1
    const next = segments.filter((_, index) => index !== removeAt)
    commitSegments(next)
    setSelectedIndex(Math.min(removeAt, next.length - 1))
  }

  const onDragStart = (index: number, event: DragEvent<HTMLButtonElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (toIndex: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const fromRaw = event.dataTransfer.getData('text/plain')
    const fromIndex = dragIndex ?? Number.parseInt(fromRaw, 10)
    if (!Number.isFinite(fromIndex)) {
      setDragIndex(null)
      return
    }
    commitSegments(reorderLinkSegments(segments, fromIndex, toIndex))
    setSelectedIndex(toIndex)
    setDragIndex(null)
  }

  return (
    <div
      className={[styles.picker, embedded ? styles.embedded : ''].filter(Boolean).join(' ')}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className={styles.pathHeader} title={fullPath}>
        {fullPath || '—'}
      </div>

      <div className={styles.segmentList}>
        {segments.map((segment, index) => {
          const isSelected = index === selectedIndex
          const useCharacterCombo = isCharacterSegmentIndex(segments, index)

          return (
            <div
              key={`${index}-${segments.length}`}
              className={[styles.segmentRow, isSelected ? styles.segmentRowSelected : '']
                .filter(Boolean)
                .join(' ')}
              onDragOver={onDragOver}
              onDrop={(event) => onDrop(index, event)}
            >
              <button
                aria-label={`Segmento ${index + 1} — arrastar`}
                className={styles.tag}
                draggable
                onClick={() => setSelectedIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragStart={(event) => onDragStart(index, event)}
                type="button"
              >
                {segmentTagLabel(segment)}
              </button>

              {useCharacterCombo ? (
                <LinkCharacterCombobox
                  ariaLabel={`Segmento ${index + 1} — campeão`}
                  onChange={(next) => updateCharacterSegment(index, next)}
                  value={segment}
                />
              ) : (
                <input
                  aria-label={`Segmento ${index + 1}`}
                  className={styles.segmentInput}
                  onChange={(event) => updateSegment(index, event.target.value)}
                  onFocus={() => setSelectedIndex(index)}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="text"
                  value={segment}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.controls}>
        <button
          aria-label="Adicionar segmento ao caminho"
          className={styles.controlBtn}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            addSegment()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Remover segmento do caminho"
          className={styles.controlBtn}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            removeSegment()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          −
        </button>
      </div>
    </div>
  )
}
