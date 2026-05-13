import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'

import { ExpandActionCapsule, type ExpandActionCapsuleKind } from '@/components/molecules/ExpandActionCapsule'
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
const EXPAND_CAPSULE_LIFETIME_SECONDS = 5

type PaletteScrollDirection = 'down' | 'idle' | 'up'

/** Teste: m/n controlam expandir/retrair (m = expandir, n = retrair), com hover na linha ou atalho global quando o foco não está no campo de pesquisa. */
type PaletteExpandOverride = 'compact' | 'default' | 'expanded'

function packFolderTagLabel(folderName: string) {
  return `📂 [${folderName}]`
}

function structureSubfolderTagLabel(subPath: string) {
  return subPath === '' ? '🗂️ Raiz' : `🗂️ ${subPath}`
}

type AddNodePaletteProps = {
  heading?: string
  onClose: () => void
  onPickSchema: (schema: NodeSchemaDefinition) => void
  /** Por schema id: nome da pasta imediata sob `src/nodeStructures/`. Ativa filtros 📂 [...]. */
  packFolderBySchemaId?: Record<string, string>
  /** Por schema id: primeira subpasta sob o pack (`''` = raiz). `temp` não gera etiqueta. */
  structureSubfolderBySchemaId?: Record<string, string>
  schemas: NodeSchemaDefinition[]
}

export function AddNodePalette({
  heading,
  onClose,
  onPickSchema,
  packFolderBySchemaId,
  structureSubfolderBySchemaId,
  schemas,
}: AddNodePaletteProps) {
  const [palettePackFolder, setPalettePackFolder] = useState<string | null>(null)
  const [paletteStructureSubfolder, setPaletteStructureSubfolder] = useState<string | null>(null)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteOrganization, setPaletteOrganization] = useState<PaletteOrganizationMode>('az')
  const [highlightedSchemaIndex, setHighlightedSchemaIndex] = useState(0)
  const [paletteHoveredOptionIndex, setPaletteHoveredOptionIndex] = useState<number | null>(null)
  const [paletteExpandOverride, setPaletteExpandOverride] = useState<PaletteExpandOverride>('default')
  const [paletteScrollDirection, setPaletteScrollDirection] = useState<PaletteScrollDirection>('idle')
  const [paletteScrollIntensity, setPaletteScrollIntensity] = useState(0)
  const [isPaletteScrollActive, setIsPaletteScrollActive] = useState(false)

  const paletteInputRef = useRef<HTMLInputElement | null>(null)
  const paletteResultsRef = useRef<HTMLDivElement | null>(null)
  const paletteHoveredOptionIndexRef = useRef<number | null>(null)
  const paletteScrollFrameRef = useRef<number | null>(null)
  const paletteScrollVelocityRef = useRef(0)

  const [expandCapsule, setExpandCapsule] = useState<{
    id: string
    kind: ExpandActionCapsuleKind
    stamp: number
  } | null>(null)

  const palettePackFolders = packFolderBySchemaId
    ? [...new Set(schemas.map((s) => packFolderBySchemaId[s.id]).filter((f): f is string => Boolean(f)))].sort(
        (a, b) => a.localeCompare(b),
      )
    : []

  const schemasInSelectedPack = useMemo(() => {
    if (palettePackFolder === null) {
      return schemas
    }
    return schemas.filter((s) => (packFolderBySchemaId?.[s.id] ?? '') === palettePackFolder)
  }, [schemas, packFolderBySchemaId, palettePackFolder])

  const paletteStructureSubfolderTags = useMemo(() => {
    if (!structureSubfolderBySchemaId) {
      return []
    }
    const next = new Set<string>()
    for (const s of schemasInSelectedPack) {
      const sub = structureSubfolderBySchemaId[s.id] ?? ''
      if (sub === 'temp') {
        continue
      }
      next.add(sub)
    }
    return Array.from(next).sort((a, b) => {
      if (a === '') {
        return -1
      }
      if (b === '') {
        return 1
      }
      return a.localeCompare(b)
    })
  }, [schemasInSelectedPack, structureSubfolderBySchemaId])

  const showStructureSubfolderTagsRow =
    Boolean(structureSubfolderBySchemaId) &&
    (paletteStructureSubfolderTags.length > 1 ||
      (paletteStructureSubfolderTags.length === 1 && paletteStructureSubfolderTags[0] !== ''))

  useEffect(() => {
    setPaletteStructureSubfolder(null)
  }, [palettePackFolder])

  useEffect(() => {
    if (!showStructureSubfolderTagsRow) {
      setPaletteStructureSubfolder(null)
    }
  }, [showStructureSubfolderTagsRow])

  const filteredSchemas = sortSchemasByOrganization(
    schemas
      .filter(
        (schema) =>
          palettePackFolder === null ||
          (packFolderBySchemaId?.[schema.id] ?? '') === palettePackFolder,
      )
      .filter((schema) => {
        if (!structureSubfolderBySchemaId || paletteStructureSubfolder === null) {
          return true
        }
        const sub = structureSubfolderBySchemaId[schema.id] ?? ''
        return sub === paletteStructureSubfolder
      })
      .filter((schema) => matchesSchemaQuery(schema, paletteQuery)),
    paletteOrganization,
  )
  const activeSchemaIndex = Math.max(0, Math.min(highlightedSchemaIndex, filteredSchemas.length - 1))

  const filteredSchemasRef = useRef(filteredSchemas)
  const activeSchemaIndexRef = useRef(activeSchemaIndex)

  useEffect(() => {
    filteredSchemasRef.current = filteredSchemas
  }, [filteredSchemas])

  useEffect(() => {
    activeSchemaIndexRef.current = activeSchemaIndex
  }, [activeSchemaIndex])

  useEffect(() => {
    paletteHoveredOptionIndexRef.current = paletteHoveredOptionIndex
  }, [paletteHoveredOptionIndex])

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (key !== 'm' && key !== 'n') {
        return
      }

      const target = event.target
      const hoveringRow = paletteHoveredOptionIndexRef.current !== null
      const focusOnSearch = target === paletteInputRef.current
      const useCtrlWhileSearching = focusOnSearch && event.ctrlKey

      if (focusOnSearch && !hoveringRow && !useCtrlWhileSearching) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const list = filteredSchemasRef.current
      const targetIdx =
        paletteHoveredOptionIndexRef.current !== null
          ? paletteHoveredOptionIndexRef.current
          : activeSchemaIndexRef.current
      const targetSchema = list[targetIdx]

      if (key === 'm') {
        setPaletteExpandOverride('expanded')

        if (targetSchema) {
          setExpandCapsule({
            id: targetSchema.id,
            kind: 'expanded',
            stamp: Date.now(),
          })
        }
      } else {
        setPaletteExpandOverride('compact')

        if (targetSchema) {
          setExpandCapsule({
            id: targetSchema.id,
            kind: 'collapsed',
            stamp: Date.now(),
          })
        }
      }
    }

    window.addEventListener('keydown', onGlobalKeyDown, true)

    return () => {
      window.removeEventListener('keydown', onGlobalKeyDown, true)
    }
  }, [])

  const dismissExpandCapsule = useCallback(() => {
    setExpandCapsule(null)
  }, [])

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
      setPaletteExpandOverride('default')
      setHighlightedSchemaIndex((currentIndex) =>
        filteredSchemas.length === 0 ? 0 : (currentIndex + 1) % filteredSchemas.length,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPaletteHoveredOptionIndex(null)
      setPaletteExpandOverride('default')
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
    setPaletteExpandOverride('default')
  }

  const paletteOptionExpanded = (index: number) => {
    const targetIndex =
      paletteHoveredOptionIndex !== null ? paletteHoveredOptionIndex : activeSchemaIndex

    if (paletteExpandOverride !== 'default') {
      if (index === targetIndex) {
        return paletteExpandOverride === 'expanded'
      }
    } else {
      return paletteHoveredOptionIndex !== null
        ? index === paletteHoveredOptionIndex
        : index === activeSchemaIndex
    }

    return false
  }

  return (
    <div className={styles.overlay} onPointerDown={onClose} role="presentation">
      {expandCapsule ? (
        <ExpandActionCapsule
          key={expandCapsule.stamp}
          kind={expandCapsule.kind}
          lifetimeSeconds={EXPAND_CAPSULE_LIFETIME_SECONDS}
          onDismiss={dismissExpandCapsule}
          schemaId={expandCapsule.id}
        />
      ) : null}
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
              setPaletteExpandOverride('default')
            }}
            onKeyDown={handlePaletteKeyDown}
            placeholder="Search schema by title or id..."
            ref={paletteInputRef}
            role="combobox"
            type="search"
            value={paletteQuery}
          />
          <div className={styles.filterRows}>
            <div className={styles.tags} aria-label="Organization modes">
              <button
                aria-pressed={paletteOrganization === 'az'}
                type="button"
                onClick={() => {
                  setPaletteOrganization('az')
                  setPaletteHoveredOptionIndex(null)
                  setPaletteExpandOverride('default')
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
                  setPaletteExpandOverride('default')
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
                  setPaletteExpandOverride('default')
                }}
              >
                Tipo de valor
              </button>
            </div>
            {palettePackFolders.length > 0 ? (
              <div className={styles.tags} aria-label="Filtrar por pasta de estruturas">
                <button
                  aria-pressed={palettePackFolder === null}
                  type="button"
                  onClick={() => {
                    setPalettePackFolder(null)
                    setHighlightedSchemaIndex(0)
                    setPaletteHoveredOptionIndex(null)
                    setPaletteExpandOverride('default')
                  }}
                >
                  Todos
                </button>
                {palettePackFolders.map((folder) => (
                  <button
                    aria-pressed={palettePackFolder === folder}
                    key={folder}
                    type="button"
                    onClick={() => {
                      setPalettePackFolder(folder)
                      setHighlightedSchemaIndex(0)
                      setPaletteHoveredOptionIndex(null)
                      setPaletteExpandOverride('default')
                    }}
                  >
                    {packFolderTagLabel(folder)}
                  </button>
                ))}
              </div>
            ) : null}
            {showStructureSubfolderTagsRow ? (
              <div className={styles.tags} aria-label="Filtrar por subpasta do pack">
                <button
                  aria-pressed={paletteStructureSubfolder === null}
                  type="button"
                  onClick={() => {
                    setPaletteStructureSubfolder(null)
                    setHighlightedSchemaIndex(0)
                    setPaletteHoveredOptionIndex(null)
                    setPaletteExpandOverride('default')
                  }}
                >
                  Todos
                </button>
                {paletteStructureSubfolderTags.map((sub) => (
                  <button
                    aria-pressed={paletteStructureSubfolder === sub}
                    key={sub === '' ? '__root__' : sub}
                    type="button"
                    onClick={() => {
                      setPaletteStructureSubfolder(sub)
                      setHighlightedSchemaIndex(0)
                      setPaletteHoveredOptionIndex(null)
                      setPaletteExpandOverride('default')
                    }}
                  >
                    {structureSubfolderTagLabel(sub)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div
            className={styles.results}
            id="node-schema-results"
            ref={paletteResultsRef}
            role="listbox"
            style={{
              '--palette-expand-slots': String(
                Math.min(Math.max(filteredSchemas.length - 4, 0), 10),
              ),
              '--palette-rows': String(Math.min(Math.max(filteredSchemas.length, 1), 14)),
            } as CSSProperties & Record<'--palette-rows' | '--palette-expand-slots', string>}
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
                    setPaletteExpandOverride('default')
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
