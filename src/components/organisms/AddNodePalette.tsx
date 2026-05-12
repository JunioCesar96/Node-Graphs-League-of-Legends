import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'

import { PaletteAddNodeOption } from '@/components/molecules/PaletteAddNodeOption'
import {
  matchesSchemaQuery,
  type PaletteOrganizationMode,
  sortSchemasByOrganization,
} from '@/core/paletteSchemaUtils'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

import styles from './AddNodePalette.module.css'

const SCROLL_CONTROL_DEAD_ZONE = 8
const MAX_SCROLL_SPEED = 28

type PaletteScrollDirection = 'down' | 'idle' | 'up'

type AddNodePaletteProps = {
  heading?: string
  onClose: () => void
  onPickSchema: (schema: NodeSchemaDefinition) => void
  schemas: NodeSchemaDefinition[]
}

export function AddNodePalette({ heading, onClose, onPickSchema, schemas }: AddNodePaletteProps) {
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteOrganization, setPaletteOrganization] = useState<PaletteOrganizationMode>('az')
  const [highlightedSchemaIndex, setHighlightedSchemaIndex] = useState(0)
  const [paletteHoveredOptionIndex, setPaletteHoveredOptionIndex] = useState<number | null>(null)
  const [paletteScrollDirection, setPaletteScrollDirection] = useState<PaletteScrollDirection>('idle')
  const [paletteScrollIntensity, setPaletteScrollIntensity] = useState(0)
  const [isPaletteScrollActive, setIsPaletteScrollActive] = useState(false)

  const paletteInputRef = useRef<HTMLInputElement | null>(null)
  const paletteResultsRef = useRef<HTMLDivElement | null>(null)
  const paletteScrollFrameRef = useRef<number | null>(null)
  const paletteScrollVelocityRef = useRef(0)

  const filteredSchemas = sortSchemasByOrganization(
    schemas.filter((schema) => matchesSchemaQuery(schema, paletteQuery)),
    paletteOrganization,
  )
  const activeSchemaIndex = Math.max(0, Math.min(highlightedSchemaIndex, filteredSchemas.length - 1))

  useEffect(() => {
    paletteInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const scrollPaletteResults = () => {
      if (paletteResultsRef.current && paletteScrollVelocityRef.current !== 0) {
        paletteResultsRef.current.scrollTop += paletteScrollVelocityRef.current
      }

      paletteScrollFrameRef.current = window.requestAnimationFrame(scrollPaletteResults)
    }

    paletteScrollFrameRef.current = window.requestAnimationFrame(scrollPaletteResults)

    return () => {
      if (paletteScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(paletteScrollFrameRef.current)
      }

      paletteScrollFrameRef.current = null
      paletteScrollVelocityRef.current = 0
    }
  }, [])

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPaletteHoveredOptionIndex(null)
      setHighlightedSchemaIndex((currentIndex) =>
        filteredSchemas.length === 0 ? 0 : (currentIndex + 1) % filteredSchemas.length,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPaletteHoveredOptionIndex(null)
      setHighlightedSchemaIndex((currentIndex) =>
        filteredSchemas.length === 0
          ? 0
          : (currentIndex - 1 + filteredSchemas.length) % filteredSchemas.length,
      )
      return
    }

    if (event.key === 'Enter') {
      const activeSchema = filteredSchemas[activeSchemaIndex]

      if (activeSchema) {
        event.preventDefault()
        onPickSchema(activeSchema)
      }
    }
  }

  const updatePaletteScrollIntent = (event: PointerEvent<HTMLButtonElement>) => {
    const controlBounds = event.currentTarget.getBoundingClientRect()
    const centerY = controlBounds.top + controlBounds.height / 2
    const distanceFromCenter = event.clientY - centerY
    const absoluteDistance = Math.abs(distanceFromCenter)

    if (absoluteDistance < SCROLL_CONTROL_DEAD_ZONE) {
      paletteScrollVelocityRef.current = 0
      setPaletteScrollDirection('idle')
      setPaletteScrollIntensity(0)
      return
    }

    const direction = distanceFromCenter > 0 ? 'down' : 'up'
    const intensity = Math.min(1, (absoluteDistance - SCROLL_CONTROL_DEAD_ZONE) / 90)

    paletteScrollVelocityRef.current = (direction === 'down' ? 1 : -1) * Math.max(2, intensity * MAX_SCROLL_SPEED)
    setPaletteScrollDirection(direction)
    setPaletteScrollIntensity(intensity)
  }

  const startPaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    setIsPaletteScrollActive(true)
    updatePaletteScrollIntent(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const movePaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isPaletteScrollActive) {
      return
    }

    updatePaletteScrollIntent(event)
    event.stopPropagation()
  }

  const stopPaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    paletteScrollVelocityRef.current = 0
    setIsPaletteScrollActive(false)
    setPaletteScrollDirection('idle')
    setPaletteScrollIntensity(0)
    event.stopPropagation()
  }

  const handlePaletteResultsPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && paletteResultsRef.current?.contains(nextTarget)) {
      return
    }

    setPaletteHoveredOptionIndex(null)
  }

  const paletteOptionExpanded = (index: number) => {
    return paletteHoveredOptionIndex !== null
      ? index === paletteHoveredOptionIndex
      : index === activeSchemaIndex
  }

  return (
    <div className={styles.overlay} onPointerDown={onClose} role="presentation">
      <div className={styles.root} onPointerDown={(event) => event.stopPropagation()}>
        <section aria-label="Add node search palette" className={styles.panel}>
          <div className={styles.header}>
            <span>{heading ?? 'add node'}</span>
            <kbd>Ctrl K</kbd>
          </div>
          <input
            aria-activedescendant={filteredSchemas[activeSchemaIndex]?.id}
            aria-controls="node-schema-results"
            aria-label="Search node schemas"
            autoComplete="off"
            className={styles.input}
            onChange={(event) => {
              setPaletteQuery(event.target.value)
              setHighlightedSchemaIndex(0)
              setPaletteHoveredOptionIndex(null)
            }}
            onKeyDown={handlePaletteKeyDown}
            placeholder="Search schema by title or id..."
            ref={paletteInputRef}
            role="combobox"
            type="search"
            value={paletteQuery}
          />
          <div className={styles.tags} aria-label="Organization modes">
            <button
              aria-pressed={paletteOrganization === 'az'}
              type="button"
              onClick={() => {
                setPaletteOrganization('az')
                setPaletteHoveredOptionIndex(null)
              }}
            >
              A-Z
            </button>
            <button
              aria-pressed={paletteOrganization === 'structure'}
              type="button"
              onClick={() => {
                setPaletteOrganization('structure')
                setPaletteHoveredOptionIndex(null)
              }}
            >
              Tipo
            </button>
            <button
              aria-pressed={paletteOrganization === 'value-type'}
              type="button"
              onClick={() => {
                setPaletteOrganization('value-type')
                setPaletteHoveredOptionIndex(null)
              }}
            >
              Tipo de valor
            </button>
          </div>
          <div
            className={styles.results}
            id="node-schema-results"
            ref={paletteResultsRef}
            role="listbox"
            onPointerLeave={handlePaletteResultsPointerLeave}
          >
            {filteredSchemas.length > 0 ? (
              filteredSchemas.map((schema, index) => (
                <PaletteAddNodeOption
                  expanded={paletteOptionExpanded(index)}
                  highlighted={index === activeSchemaIndex}
                  key={schema.id}
                  onClick={() => onPickSchema(schema)}
                  onPointerEnter={() => {
                    setHighlightedSchemaIndex(index)
                    setPaletteHoveredOptionIndex(index)
                  }}
                  schema={schema}
                />
              ))
            ) : (
              <div className={styles.empty}>No schema found</div>
            )}
          </div>
        </section>
        <button
          aria-label="Custom add node list scroll control"
          className={[
            styles.scrollControl,
            isPaletteScrollActive ? styles.scrollControlActive : '',
            paletteScrollDirection === 'up' ? styles.scrollControlUp : '',
            paletteScrollDirection === 'down' ? styles.scrollControlDown : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerCancel={stopPaletteScroll}
          onPointerDown={startPaletteScroll}
          onPointerMove={movePaletteScroll}
          onPointerUp={stopPaletteScroll}
          style={
            {
              '--scroll-duration': `${Math.max(180, 720 - paletteScrollIntensity * 520)}ms`,
              '--scroll-glow': `${8 + paletteScrollIntensity * 18}px`,
              '--scroll-intensity': paletteScrollIntensity.toString(),
              '--scroll-shift': `${2 + paletteScrollIntensity * 5}px`,
              '--scroll-shift-negative': `${-(2 + paletteScrollIntensity * 5)}px`,
            } as CSSProperties & Record<`--${string}`, string>
          }
          type="button"
        >
          <span className={styles.scrollArrowUp} aria-hidden="true" />
          <span className={styles.scrollCenter} aria-hidden="true" />
          <span className={styles.scrollArrowDown} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
