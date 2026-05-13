import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEventHandler, PointerEventHandler } from 'react'

import { SyntaxType } from '@/components/atoms/SyntaxType'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { getSchemaStructureLabel, getSchemaValueTypes } from '@/core/paletteSchemaUtils'

import styles from './PaletteAddNodeOption.module.css'

type PaletteAddNodeOptionProps = {
  expanded: boolean
  highlighted: boolean
  onClick: () => void
  onPointerEnter: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
  schema: NodeSchemaDefinition
}

export function PaletteAddNodeOption({
  expanded,
  highlighted,
  onClick,
  onPointerEnter,
  onPointerLeave,
  schema,
}: PaletteAddNodeOptionProps) {
  const valueTypes = getSchemaValueTypes(schema)
  const structureLabel = getSchemaStructureLabel(schema)

  const stopInfoPropagation: MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation()
  }

  const badgeRef = useRef<HTMLSpanElement>(null)
  const closeTooltipTimerRef = useRef<number | undefined>(undefined)
  const [isInfoTooltipOpen, setIsInfoTooltipOpen] = useState(false)
  const [tooltipCoords, setTooltipCoords] = useState<{ left: number; top: number } | null>(null)

  const clearTooltipCloseTimer = () => {
    if (closeTooltipTimerRef.current !== undefined) {
      window.clearTimeout(closeTooltipTimerRef.current)
      closeTooltipTimerRef.current = undefined
    }
  }

  const scheduleTooltipClose = () => {
    clearTooltipCloseTimer()
    closeTooltipTimerRef.current = window.setTimeout(() => {
      setTooltipCoords(null)
      setIsInfoTooltipOpen(false)
      closeTooltipTimerRef.current = undefined
    }, 120)
  }

  const measureTooltipAnchor = useCallback(() => {
    const el = badgeRef.current

    if (!el) {
      return
    }

    const r = el.getBoundingClientRect()
    const gapPx = 8

    setTooltipCoords({
      left: r.left - gapPx,
      top: r.top + r.height / 2,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isInfoTooltipOpen) {
      return
    }

    measureTooltipAnchor()
  }, [isInfoTooltipOpen, measureTooltipAnchor])

  useEffect(() => {
    if (!isInfoTooltipOpen) {
      return
    }

    window.addEventListener('scroll', measureTooltipAnchor, true)
    window.addEventListener('resize', measureTooltipAnchor)

    return () => {
      window.removeEventListener('scroll', measureTooltipAnchor, true)
      window.removeEventListener('resize', measureTooltipAnchor)
    }
  }, [isInfoTooltipOpen, measureTooltipAnchor])

  useEffect(() => () => clearTooltipCloseTimer(), [])

  return (
    <button
      aria-selected={highlighted}
      className={[styles.option, highlighted ? styles.keyboardSelected : ''].filter(Boolean).join(' ')}
      data-expanded={expanded ? 'true' : 'false'}
      data-internal-structure-shape={schema.internalStructures.length > 0 ? 'square' : 'round'}
      id={schema.id}
      role="option"
      tabIndex={-1}
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onPointerEnter={onPointerEnter}
      {...(onPointerLeave ? { onPointerLeave } : {})}
    >
      <span
        aria-hidden="true"
        className={styles.infoBadge}
        ref={badgeRef}
        onPointerEnter={() => {
          clearTooltipCloseTimer()
          setIsInfoTooltipOpen(true)
        }}
        onPointerLeave={scheduleTooltipClose}
        onClick={stopInfoPropagation}
      >
        i
      </span>
      {isInfoTooltipOpen && tooltipCoords !== null ? createPortal(
        <span
          className={styles.tooltipPortal}
          role="presentation"
          style={{
            left: tooltipCoords.left,
            top: tooltipCoords.top,
          }}
          onPointerEnter={() => {
            clearTooltipCloseTimer()
          }}
          onPointerLeave={scheduleTooltipClose}
        >
          {schema.parameters.length} parâmetros · {schema.internalStructures.length}{' '}
          {schema.internalStructures.length === 1 ? 'Internal_Structure' : 'Internal_Structures'}
        </span>,
        document.body,
      )
        : null}
      <span className={styles.content}>
        <span className={styles.titleRow}>
          <span className={styles.title} title={schema.title}>
            {schema.title}
          </span>
          <small className={styles.schemaId} title={schema.id}>
            {schema.id}
          </small>
        </span>
        <span className={styles.meta}>
          <span className={styles.structureTag}>{structureLabel}</span>
          {valueTypes.map((typeName) => (
            <span className={styles.syntaxTypeChipWrap} key={typeName}>
              <SyntaxType type={typeName} />
            </span>
          ))}
        </span>
        <span className={styles.sections}>
          <span
            className={
              schema.internalStructures.length > 0 ? styles.sectionsInnerSplit : styles.sectionsInnerSingle
            }
          >
            <span className={styles.sectionColumn}>
              <strong>Parâmetros</strong>
              {schema.parameters.length > 0
                ? schema.parameters.map((parameter) => (
                    <span className={styles.parameterLine} key={parameter.id}>
                      <span className={styles.parameterName}>{parameter.name}</span>
                      <span aria-hidden className={styles.parameterSep}>
                        :
                      </span>
                      <SyntaxType className={styles.syntaxTypeInLine} type={parameter.type} />
                    </span>
                  ))
                : (
                  <span className={styles.parameterLineNone}>nenhum</span>
                )}
            </span>
            {schema.internalStructures.length > 0 ? (
              <span className={styles.sectionColumn}>
                <strong>Internal_Structures</strong>
                {schema.internalStructures.map((structure) => (
                  <em className={styles.internalStructureLine} key={structure.id}>
                    {structure.name} -&gt; {structure.schemaId}
                  </em>
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  )
}
