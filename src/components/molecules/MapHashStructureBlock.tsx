import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { Port } from '@/components/atoms/Port'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import {
  isWirelessPortPulsing,
  toWirelessPortLinkProps,
  type WirelessPortHandlers,
  type WirelessPortLink,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { ElementViewMode } from '@/core/nodeSchema'
import { clampSelectedIndex } from '@/core/elementViewState'
import {
  MapHashStructurePicker,
  type MapHashParameterKind,
} from '@/components/molecules/MapHashStructurePicker'
import type { InternalStructureDefinition } from '@/core/nodeSchema'
import type { NodeElementListItem } from '@/core/listNodeElements'
import {
  catalogStructuresFromEntries,
  entryWithStructure,
  hasMapHashStructure,
  type MapHashStructureCatalogItem,
  type MapHashStructureEntry,
} from '@/core/mapHashStructureValue'

import styles from '@/components/molecules/MapHashStructureBlock.module.css'

type StructurePickerTarget =
  | { mode: 'map' }
  | { mode: 'hash'; index: number }

export type MapHashStructureBlockConfig = {
  parameterKind: MapHashParameterKind
  newKeyDefault: string
  normalizeKey: (raw: string) => string
  keyEntryLabel?: string
  parseEntries: (raw: string) => MapHashStructureEntry[]
  formatEntries: (entries: readonly MapHashStructureEntry[]) => string
  slotIdForKey: (parameterId: string, key: string) => string
}

type MapHashStructureBlockProps = MapHashStructureBlockConfig & {
  activeSlotId?: string
  canvasNodeId: string
  defaultValue?: string
  onChange: (next: string) => void
  onStructureSlotRemoved?: (slotId: string) => void
  parameterId: string
  parameterTitle: string
  value: string
  onOutputWireKeyboard?: (slot: InternalStructureDefinition) => void
  onOutputWirePointerCancel?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerDown?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerMove?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerUp?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  wirelessOutputLinks?: ReadonlyMap<string, WirelessPortLink>
  wirelessPortHandlers?: WirelessPortHandlers
  wirelessPortPulse?: WirelessPortPulseTarget
  viewMode?: ElementViewMode
  selectedIndex?: number
  onViewModeChange?: (mode: ElementViewMode) => void
  onSelectedIndexChange?: (index: number) => void
}

function slotForEntry(
  slotIdForKey: (parameterId: string, key: string) => string,
  parameterId: string,
  entry: MapHashStructureEntry,
): InternalStructureDefinition {
  return {
    id: slotIdForKey(parameterId, entry.key),
    name: entry.typeName || entry.schemaId,
    schemaId: entry.schemaId,
  }
}

function removalElementsFromEntries(entries: readonly MapHashStructureEntry[]): NodeElementListItem[] {
  return entries.map((entry) => ({
    kind: 'embedSlot' as const,
    id: entry.key,
    name: entry.key,
    meta: hasMapHashStructure(entry) ? entry.typeName || entry.schemaId : 'sem estrutura',
  }))
}

export function MapHashStructureBlock({
  activeSlotId,
  canvasNodeId,
  defaultValue = '',
  formatEntries,
  keyEntryLabel = 'hash',
  newKeyDefault,
  normalizeKey,
  onChange,
  onStructureSlotRemoved,
  parameterId,
  parameterKind,
  parameterTitle,
  parseEntries,
  slotIdForKey,
  value,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  wirelessOutputLinks,
  wirelessPortHandlers,
  wirelessPortPulse,
  viewMode = 'list',
  selectedIndex = 0,
  onViewModeChange,
  onSelectedIndexChange,
}: MapHashStructureBlockProps) {
  const entries = useMemo(() => parseEntries(value), [parseEntries, value])
  const [structurePickerTarget, setStructurePickerTarget] = useState<StructurePickerTarget | null>(null)
  const [hashRemovalOpen, setHashRemovalOpen] = useState(false)
  const [hashRemovalSelectedKey, setHashRemovalSelectedKey] = useState<string | null>(null)
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)

  const isCompact = viewMode === 'compact'
  const safeSelectedIndex = clampSelectedIndex(entries.length, selectedIndex)

  const catalog = useMemo((): MapHashStructureCatalogItem[] => {
    const fromEntries = catalogStructuresFromEntries(entries)
    if (fromEntries.length > 0) {
      return fromEntries
    }
    return catalogStructuresFromEntries(parseEntries(defaultValue))
  }, [defaultValue, entries, parseEntries])

  const removalElements = useMemo(() => removalElementsFromEntries(entries), [entries])

  const commitEntries = useCallback(
    (next: MapHashStructureEntry[]) => {
      onChange(formatEntries(next))
    },
    [formatEntries, onChange],
  )

  const updateEntry = (index: number, patch: Partial<MapHashStructureEntry>) => {
    const next = entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    commitEntries(next)
  }

  const notifyStructureRemoved = (entry: MapHashStructureEntry) => {
    if (!hasMapHashStructure(entry) || !onStructureSlotRemoved) {
      return
    }
    onStructureSlotRemoved(slotIdForKey(parameterId, entry.key))
  }

  const applyStructureChoice = (item: MapHashStructureCatalogItem) => {
    if (!structurePickerTarget) {
      return
    }
    if (structurePickerTarget.mode === 'map') {
      commitEntries([...entries, entryWithStructure(newKeyDefault, item.typeName, item.schemaId)])
      return
    }
    updateEntry(structurePickerTarget.index, {
      schemaId: item.schemaId,
      typeName: item.typeName,
    })
  }

  const clearStructureAt = (index: number) => {
    const entry = entries[index]
    if (!entry) {
      return
    }
    notifyStructureRemoved(entry)
    updateEntry(index, { schemaId: '', typeName: '' })
  }

  const removeHashEntry = (item: NodeElementListItem) => {
    const index = entries.findIndex((entry) => entry.key === item.id)
    if (index < 0) {
      return
    }
    notifyStructureRemoved(entries[index]!)
    commitEntries(entries.filter((_, i) => i !== index))
  }

  const canMapAdd = catalog.length > 0
  const canMapRemove = entries.length > 0

  const indexPickerItems = useMemo((): StructureIndexPickerItem[] => {
    return entries.map((entry, index) => ({
      index,
      label: entry.key,
      meta: hasMapHashStructure(entry) ? entry.typeName || entry.schemaId : undefined,
    }))
  }, [entries])

  const renderEntryRow = (entry: MapHashStructureEntry, index: number) => {
    const hasStructure = hasMapHashStructure(entry)
    const slot = hasStructure ? slotForEntry(slotIdForKey, parameterId, entry) : null
    return (
      <li className={styles.entryGroup} key={`${entry.key}-${index}`}>
        <div className={styles.hashRow}>
          <div className={styles.hashField}>
            <span className={styles.hashBracket}>{'{'}</span>
            <input
              aria-label={`${keyEntryLabel} entrada ${index}`}
              className={styles.hashInput}
              onChange={(event) => updateEntry(index, { key: normalizeKey(event.target.value) })}
              type="text"
              value={entry.key}
            />
            <span className={styles.hashBracket}>{'}'}</span>
          </div>
          <div className={styles.hashStructureActions}>
            <button
              aria-label="Remover estrutura desta entrada"
              className={styles.removeButton}
              disabled={!hasStructure}
              onClick={() => clearStructureAt(index)}
              title={hasStructure ? 'Remover estrutura interna' : 'Sem estrutura'}
              type="button"
            >
              −
            </button>
            <button
              aria-label="Adicionar estrutura nesta entrada"
              className={styles.addButton}
              disabled={hasStructure || !canMapAdd}
              onClick={() => setStructurePickerTarget({ mode: 'hash', index })}
              title={
                hasStructure
                  ? 'Já existe estrutura nesta entrada'
                  : canMapAdd
                    ? 'Adicionar estrutura interna'
                    : 'Sem tipos no catálogo'
              }
              type="button"
            >
              +
            </button>
          </div>
        </div>
        {hasStructure && slot ? (
          <div className={styles.structureSlot}>
            <span className={styles.structureName} title={entry.typeName}>
              {entry.typeName || entry.schemaId}
            </span>
            <Port
              active={slot.id === activeSlotId}
              direction="output"
              graphInternalStructureId={slot.id}
              graphNodeId={canvasNodeId}
              graphPortKind="output"
              label={`Ligar ${entry.typeName}`}
              onWireActivateKeyboard={
                onOutputWireKeyboard ? () => onOutputWireKeyboard(slot) : undefined
              }
              onWirePointerCancel={
                onOutputWirePointerCancel
                  ? (event) => onOutputWirePointerCancel(slot, event)
                  : undefined
              }
              onWirePointerDown={
                onOutputWirePointerDown
                  ? (event) => onOutputWirePointerDown(slot, event)
                  : undefined
              }
              onWirePointerMove={
                onOutputWirePointerMove
                  ? (event) => onOutputWirePointerMove(slot, event)
                  : undefined
              }
              onWirePointerUp={
                onOutputWirePointerUp ? (event) => onOutputWirePointerUp(slot, event) : undefined
              }
              wirelessLink={toWirelessPortLinkProps(
                wirelessOutputLinks?.get(slot.id),
                wirelessPortHandlers,
                isWirelessPortPulsing(
                  wirelessPortPulse,
                  wirelessOutputLinks?.get(slot.id)?.connectionId ?? '',
                  'output',
                  slot.id,
                ),
              )}
            />
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <h4 className={styles.blockTitle} title={parameterTitle}>
          {parameterTitle}
        </h4>
        <div className={styles.mapActions}>
          {onViewModeChange ? (
            <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
          ) : null}
          <button
            aria-label={`Remover entrada ${keyEntryLabel} de ${parameterTitle}`}
            className={styles.removeButton}
            disabled={!canMapRemove}
            onClick={() => {
              setHashRemovalSelectedKey(null)
              setHashRemovalOpen(true)
            }}
            title={canMapRemove ? `Remover entrada ${keyEntryLabel}` : 'Mapa vazio'}
            type="button"
          >
            −
          </button>
          <button
            aria-label={`Adicionar entrada ${keyEntryLabel} em ${parameterTitle}`}
            className={styles.addButton}
            disabled={!canMapAdd}
            onClick={() => setStructurePickerTarget({ mode: 'map' })}
            title={canMapAdd ? `Adicionar ${keyEntryLabel} com estrutura` : 'Sem tipos no catálogo'}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <ul className={styles.entries}>
        {entries.length === 0 ? (
          <li>
            <p className={styles.emptyHint}>
              Mapa vazio — use + no cabeçalho para adicionar {keyEntryLabel} → estrutura.
            </p>
          </li>
        ) : isCompact ? (
          <>{renderEntryRow(entries[safeSelectedIndex]!, safeSelectedIndex)}</>
        ) : (
          entries.map((entry, index) => renderEntryRow(entry, index))
        )}
      </ul>

      {isCompact && entries.length > 0 && onSelectedIndexChange ? (
        <StructureIndexPager
          onCounterClick={() => setIndexPickerOpen(true)}
          onSelectedIndexChange={onSelectedIndexChange}
          selectedIndex={safeSelectedIndex}
          total={entries.length}
        />
      ) : null}

      <StructureIndexPicker
        items={indexPickerItems}
        onClose={() => setIndexPickerOpen(false)}
        onSelect={(index) => onSelectedIndexChange?.(index)}
        open={indexPickerOpen}
        selectedIndex={safeSelectedIndex}
        title={`Escolher índice — ${parameterTitle}`}
      />


      <MapHashStructurePicker
        catalog={catalog}
        onClose={() => setStructurePickerTarget(null)}
        onConfirm={applyStructureChoice}
        open={structurePickerTarget !== null}
        parameterKind={parameterKind}
        parameterTitle={parameterTitle}
      />

      <ElementRemovalPicker
        confirmLabel="Remover"
        dialogSubtitle={
          <>
            Escolha a entrada hash a remover de <strong>{parameterTitle}</strong>.
          </>
        }
        dialogTitle="Remover entrada hash"
        elements={removalElements}
        hideKindLabel
        nodeTitle={parameterTitle}
        onClose={() => {
          setHashRemovalOpen(false)
          setHashRemovalSelectedKey(null)
        }}
        onConfirm={removeHashEntry}
        onSelectKey={setHashRemovalSelectedKey}
        open={hashRemovalOpen}
        selectedKey={hashRemovalSelectedKey}
      />
    </div>
  )
}
