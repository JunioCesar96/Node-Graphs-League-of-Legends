import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { BlockSlot } from '@/components/atoms/BlockSlot'
import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import {
  MapHashStructurePicker,
  type MapHashParameterKind,
} from '@/components/molecules/MapHashStructurePicker'
import {
  StructureListPanel,
  type StructureListPanelActions,
  type StructureListPanelItem,
} from '@/components/molecules/StructureListPanel'
import type { BlockSlotWirelessLink } from '@/core/blockConnectionDisplay'
import { isBlockSlotPulsing } from '@/core/blockConnectionDisplay'
import { matchesBlockMapHashSearch } from '@/core/blockMapHashFieldLayout'
import type { NodeElementListItem } from '@/core/listNodeElements'
import {
  catalogStructuresFromEntries,
  entryWithStructure,
  hasMapHashStructure,
  type MapHashStructureCatalogItem,
  type MapHashStructureEntry,
} from '@/core/mapHashStructureValue'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import { clampBlockSelectedIndex } from '@/core/blockElementViewState'

import styles from './BlockMapHashStructureField.module.css'

export type BlockMapHashStructureFieldConfig = {
  parameterKind: MapHashParameterKind
  newKeyDefault: string
  normalizeKey: (raw: string) => string
  parseEntries: (raw: string) => MapHashStructureEntry[]
  formatEntries: (entries: readonly MapHashStructureEntry[]) => string
  slotIdForKey: (parameterId: string, key: string) => string
  emptyHint: string
}

type BlockMapHashStructureFieldProps = BlockMapHashStructureFieldConfig & {
  activeSlotId?: string
  canvasNodeId: string
  defaultValue?: string
  interactionLocked?: boolean
  parameterId: string
  parameterTitle: string
  value: string
  blockWirelessSlots?: ReadonlyMap<string, BlockSlotWirelessLink>
  pulseSlotId?: string
  onCommit: (value: string) => void
  onInputFocusChange?: (focused: boolean) => void
  onListOpenChange?: (open: boolean) => void
  onStructureSlotRemoved?: (slotId: string) => void
  onOutputPointerDown?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputPointerUp?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputPointerMove?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onSlotWirelessHoverStart?: (slotId: string, link: BlockSlotWirelessLink) => void
  onSlotWirelessHoverEnd?: () => void
  lightModeEnabled?: boolean
  persistedSelectedIndex?: number
  onPersistedSelectedIndexChange?: (index: number) => void
  /** Coluna slotOut da linha — mantém o slot alinhado com as outras linhas do bloco. */
  slotOutRef?: RefObject<HTMLDivElement | null>
}

function removalElementsFromEntries(entries: readonly MapHashStructureEntry[]): NodeElementListItem[] {
  return entries.map((entry) => ({
    kind: 'embedSlot' as const,
    id: entry.key,
    name: entry.key,
    meta: hasMapHashStructure(entry) ? entry.typeName || entry.schemaId : 'sem estrutura',
  }))
}

export function BlockMapHashStructureField({
  activeSlotId,
  canvasNodeId,
  defaultValue = '',
  emptyHint,
  formatEntries,
  interactionLocked = false,
  newKeyDefault,
  normalizeKey,
  onCommit,
  onInputFocusChange,
  onListOpenChange,
  onOutputPointerDown,
  onOutputPointerMove,
  onOutputPointerUp,
  onSlotWirelessHoverEnd,
  onSlotWirelessHoverStart,
  onStructureSlotRemoved,
  parameterId,
  parameterKind,
  parameterTitle,
  parseEntries,
  pulseSlotId,
  blockWirelessSlots,
  slotIdForKey,
  slotOutRef,
  value,
  lightModeEnabled = false,
  persistedSelectedIndex,
  onPersistedSelectedIndexChange,
}: BlockMapHashStructureFieldProps) {
  const entries = useMemo(() => parseEntries(value), [parseEntries, value])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [inputDraft, setInputDraft] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [inputExpanded, setInputExpanded] = useState(false)
  const [structurePickerOpen, setStructurePickerOpen] = useState(false)
  const [hashRemovalOpen, setHashRemovalOpen] = useState(false)
  const [hashRemovalSelectedKey, setHashRemovalSelectedKey] = useState<string | null>(null)
  const [removeConfirmKey, setRemoveConfirmKey] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<{ draft: string; index: number } | null>(null)
  const inputFocusedRef = useRef(false)
  const editDialogInputRef = useRef<HTMLInputElement>(null)
  const controlRowRef = useRef<HTMLDivElement>(null)
  const [slotOutletReady, setSlotOutletReady] = useState(false)

  const setListOpenState = useCallback(
    (open: boolean) => {
      setListOpen(open)
      onListOpenChange?.(open)
    },
    [onListOpenChange],
  )

  const catalog = useMemo((): MapHashStructureCatalogItem[] => {
    const fromEntries = catalogStructuresFromEntries(entries)
    if (fromEntries.length > 0) {
      return fromEntries
    }
    return catalogStructuresFromEntries(parseEntries(defaultValue))
  }, [defaultValue, entries, parseEntries])

  const removalElements = useMemo(() => removalElementsFromEntries(entries), [entries])

  const listItems = useMemo(
    (): StructureListPanelItem[] =>
      entries.map((entry, index) => ({
        id: entry.key,
        index,
        label: entry.key,
      })),
    [entries],
  )

  const selectedEntry = useMemo(() => {
    if (selectedKey) {
      const match = entries.find((entry) => entry.key === selectedKey)
      if (match) {
        return match
      }
    }
    return entries[0] ?? null
  }, [entries, selectedKey])

  const selectedIndex = useMemo(() => {
    if (!selectedEntry) {
      return 0
    }
    return entries.findIndex((entry) => entry.key === selectedEntry.key)
  }, [entries, selectedEntry])

  const safeSelectedIndex = clampBlockSelectedIndex(
    entries.length,
    persistedSelectedIndex ?? (selectedIndex >= 0 ? selectedIndex : 0),
  )

  useEffect(() => {
    if (persistedSelectedIndex === undefined) {
      return
    }
    const entry = entries[clampBlockSelectedIndex(entries.length, persistedSelectedIndex)]
    if (!entry) {
      return
    }
    if (inputFocusedRef.current) {
      return
    }
    setSelectedKey(entry.key)
    setInputDraft(entry.key)
  }, [entries, persistedSelectedIndex])

  useEffect(() => {
    if (inputFocusedRef.current) {
      return
    }
    if (selectedKey && entries.some((entry) => entry.key === selectedKey)) {
      setInputDraft(selectedKey)
      return
    }
    const first = entries[0]
    setSelectedKey(first?.key ?? null)
    setInputDraft(first?.key ?? '')
  }, [entries, selectedKey])

  useLayoutEffect(() => {
    if (!slotOutRef) {
      setSlotOutletReady(false)
      return
    }
    setSlotOutletReady(Boolean(slotOutRef.current))
  }, [slotOutRef, selectedEntry, entries.length, inputExpanded, activeSlotId])

  const commitEntries = useCallback(
    (next: MapHashStructureEntry[]) => {
      if (interactionLocked) {
        return
      }
      onCommit(formatEntries(next))
    },
    [formatEntries, interactionLocked, onCommit],
  )

  const notifyStructureRemoved = (entry: MapHashStructureEntry) => {
    if (!hasMapHashStructure(entry) || !onStructureSlotRemoved) {
      return
    }
    onStructureSlotRemoved(slotIdForKey(parameterId, entry.key))
  }

  const removeEntryByKey = (key: string) => {
    const index = entries.findIndex((entry) => entry.key === key)
    if (index < 0) {
      return
    }
    notifyStructureRemoved(entries[index]!)
    const next = entries.filter((entry) => entry.key !== key)
    commitEntries(next)
    if (selectedKey === key) {
      const nextKey = next[0]?.key ?? null
      setSelectedKey(nextKey)
      setInputDraft(nextKey ?? '')
    }
  }

  const removeHashEntry = (item: NodeElementListItem) => {
    removeEntryByKey(item.id)
  }

  const applyStructureChoice = (item: MapHashStructureCatalogItem) => {
    const nextEntry = entryWithStructure(newKeyDefault, item.typeName, item.schemaId)
    commitEntries([...entries, nextEntry])
    setSelectedKey(nextEntry.key)
    setInputDraft(nextEntry.key)
    setListOpenState(true)
  }

  const updateEntryKey = (index: number, rawKey: string) => {
    const normalized = normalizeKey(rawKey.trim())
    const current = entries[index]
    if (!current || normalized === current.key) {
      return
    }
    if (entries.some((entry, i) => i !== index && entry.key === normalized)) {
      setInputDraft(current.key)
      return
    }
    if (hasMapHashStructure(current)) {
      notifyStructureRemoved(current)
    }
    const next = entries.map((entry, i) => (i === index ? { ...entry, key: normalized } : entry))
    commitEntries(next)
    setSelectedKey(normalized)
    setInputDraft(normalized)
  }

  const commitInputDraft = () => {
    if (safeSelectedIndex < 0 || safeSelectedIndex >= entries.length) {
      return
    }
    updateEntryKey(safeSelectedIndex, inputDraft)
  }

  const pendingRemoveEntry = useMemo(() => {
    if (!removeConfirmKey) {
      return null
    }
    return entries.find((entry) => entry.key === removeConfirmKey) ?? null
  }, [entries, removeConfirmKey])

  useEffect(() => {
    if (!removeConfirmKey) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRemoveConfirmKey(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removeConfirmKey])

  const handleRemoveClick = () => {
    if (interactionLocked || entries.length === 0) {
      return
    }
    const keyToRemove = selectedKey ?? entries[safeSelectedIndex]?.key ?? null
    if (keyToRemove) {
      setRemoveConfirmKey(keyToRemove)
      return
    }
    setHashRemovalSelectedKey(null)
    setHashRemovalOpen(true)
  }

  const confirmRemoveEntry = () => {
    if (!removeConfirmKey) {
      return
    }
    removeEntryByKey(removeConfirmKey)
    setRemoveConfirmKey(null)
  }

  const editDialogEntry = useMemo(() => {
    if (!editDialog) {
      return null
    }
    return entries[editDialog.index] ?? null
  }, [editDialog, entries])

  useEffect(() => {
    if (!editDialog) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditDialog(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editDialog])

  useEffect(() => {
    if (editDialog === null) {
      return
    }
    const frame = requestAnimationFrame(() => {
      editDialogInputRef.current?.focus()
      editDialogInputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [editDialog?.index])

  const openEditDialog = () => {
    if (interactionLocked || entries.length === 0) {
      return
    }
    const entry = entries[safeSelectedIndex]
    if (!entry) {
      return
    }
    setEditDialog({ index: safeSelectedIndex, draft: entry.key })
  }

  const applyEditDialog = () => {
    if (!editDialog) {
      return
    }
    updateEntryKey(editDialog.index, editDialog.draft)
    setEditDialog(null)
  }

  const selectEntry = (entry: MapHashStructureEntry, keepListOpen = false) => {
    setSelectedKey(entry.key)
    setInputDraft(entry.key)
    if (!keepListOpen) {
      setListOpenState(false)
      inputFocusedRef.current = false
    }
  }

  const navigateToIndex = (index: number) => {
    onPersistedSelectedIndexChange?.(index)
    const entry = entries[index]
    if (!entry) {
      return
    }
    selectEntry(entry, true)
  }

  const toggleList = () => {
    setListOpenState(!listOpen)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitInputDraft()
      inputFocusedRef.current = false
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setInputDraft(selectedEntry?.key ?? '')
      inputFocusedRef.current = false
      ;(event.target as HTMLInputElement).blur()
    }
  }

  const canAdd = catalog.length > 0 && !interactionLocked
  const canEdit = entries.length > 0 && !interactionLocked
  const canRemove = entries.length > 0 && !interactionLocked

  const listActions = useMemo((): StructureListPanelActions => {
    return {
      edit: {
        ariaLabel: `Editar entrada de ${parameterTitle}`,
        disabled: !canEdit,
        onClick: openEditDialog,
        title: canEdit ? 'Editar caminho da entrada seleccionada' : 'Mapa vazio',
      },
      add: {
        ariaLabel: `Adicionar entrada em ${parameterTitle}`,
        disabled: !canAdd,
        onClick: () => setStructurePickerOpen(true),
        title: canAdd ? 'Adicionar entrada' : 'Sem tipos no catálogo',
      },
      remove: {
        ariaLabel: `Remover entrada de ${parameterTitle}`,
        disabled: !canRemove,
        onClick: handleRemoveClick,
        title: canRemove ? 'Remover entrada seleccionada' : 'Mapa vazio',
      },
    }
  }, [
    canAdd,
    canEdit,
    canRemove,
    handleRemoveClick,
    openEditDialog,
    parameterTitle,
  ])

  const renderSlot = (entry: MapHashStructureEntry) => {
    if (!hasMapHashStructure(entry)) {
      return null
    }
    const slotId = slotIdForKey(parameterId, entry.key)
    const slotLink = blockWirelessSlots?.get(slotId)
    return (
      <BlockSlot
        variant="out"
        ariaLabel={`Saída ${entry.key}`}
        disabled={interactionLocked}
        active={activeSlotId === slotId}
        linked={Boolean(slotLink)}
        wireless={slotLink?.routing === 'wireless'}
        forced={slotLink?.forced === true}
        pulsing={isBlockSlotPulsing(
          pulseSlotId ? { nodeId: canvasNodeId, slotId: pulseSlotId } : null,
          canvasNodeId,
          slotId,
        )}
        slotId={slotId}
        nodeId={canvasNodeId}
        onPointerDown={(event) => {
          event.stopPropagation()
          onOutputPointerDown?.(slotId, event)
        }}
        onPointerUp={(event) => onOutputPointerUp?.(slotId, event)}
        onPointerMove={(event) => onOutputPointerMove?.(slotId, event)}
        onPointerEnter={() => {
          if (slotLink) {
            onSlotWirelessHoverStart?.(slotId, slotLink)
          }
        }}
        onPointerLeave={onSlotWirelessHoverEnd}
      />
    )
  }

  const structureSlot =
    selectedEntry && hasMapHashStructure(selectedEntry) ? renderSlot(selectedEntry) : null

  const portaledStructureSlot =
    slotOutRef?.current && slotOutletReady && structureSlot && typeof document !== 'undefined'
      ? createPortal(<div className={styles.slotOutAnchor}>{structureSlot}</div>, slotOutRef.current)
      : null

  const inlineStructureSlot =
    !slotOutRef && structureSlot ? (
      <span className={styles.slotWrap}>{structureSlot}</span>
    ) : null

  return (
    <div
      className={styles.host}
      data-input-focused={inputExpanded ? '1' : '0'}
      data-parameter-type={parameterKind}
    >
      <div
        className={styles.inputRow}
        ref={controlRowRef}
      >
        <button
          aria-expanded={listOpen}
          aria-label={listOpen ? 'Recolher lista' : 'Abrir lista de entradas'}
          className={styles.toggleButton}
          disabled={entries.length === 0}
          onClick={(event) => {
            event.stopPropagation()
            toggleList()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          title={listOpen ? 'Recolher lista' : 'Abrir lista'}
          type="button"
        >
          {listOpen ? '▾' : '▸'}
        </button>
        {lightModeEnabled && entries.length > 1 ? (
          <StructureIndexPager
            className={styles.indexPager}
            onSelectedIndexChange={navigateToIndex}
            selectedIndex={safeSelectedIndex}
            total={entries.length}
          />
        ) : (
          <span
            aria-label={
              entries.length === 0
                ? 'Sem entradas'
                : `Índice ${String(safeSelectedIndex)} de ${String(entries.length - 1)}`
            }
            className={styles.currentIndex}
            title={
              entries.length === 0
                ? 'Índice'
                : `Índice ${String(safeSelectedIndex)} / ${String(entries.length - 1)}`
            }
          >
            {entries.length === 0 ? '—' : String(safeSelectedIndex)}
          </span>
        )}
        <input
          aria-autocomplete="none"
          aria-expanded={false}
          aria-haspopup="listbox"
          aria-label={`Valor de ${parameterTitle}`}
          autoComplete="off"
          className={styles.valueInput}
          disabled={interactionLocked || entries.length === 0}
          placeholder={entries.length === 0 ? emptyHint : undefined}
          spellCheck={false}
          type="text"
          value={inputDraft}
          onBlur={() => {
            inputFocusedRef.current = false
            setInputExpanded(false)
            onInputFocusChange?.(false)
            commitInputDraft()
          }}
          onChange={(event) => setInputDraft(event.target.value)}
          onFocus={() => {
            inputFocusedRef.current = true
            setInputExpanded(true)
            onInputFocusChange?.(true)
            if (listOpen) {
              setListOpenState(false)
            }
          }}
          onKeyDown={onInputKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        />
        {inlineStructureSlot}
      </div>

      {portaledStructureSlot}
      <StructureListPanel
        actions={listActions}
        anchorRef={controlRowRef}
        dismissGuardRefs={[controlRowRef]}
        emptyHint={emptyHint}
        filterItem={(item, query) => {
          const entry = entries[item.index]
          return entry ? matchesBlockMapHashSearch(entry, query) : false
        }}
        interactionLocked={interactionLocked}
        itemCountForHeight={entries.length}
        items={listItems}
        listTitle={parameterTitle}
        open={listOpen}
        portalDataAttr="data-block-map-hash-list-portal"
        selectedId={selectedKey}
        selectedIndex={safeSelectedIndex}
        onOpenChange={setListOpenState}
        onPickItem={(item) => {
          navigateToIndex(item.index)
        }}
        onSelectIndex={navigateToIndex}
      />

      {removeConfirmKey && pendingRemoveEntry && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.removeConfirmBackdrop}
              role="presentation"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setRemoveConfirmKey(null)
                }
              }}
            >
              <div
                aria-describedby="block-map-hash-remove-confirm-path"
                aria-labelledby="block-map-hash-remove-confirm-title"
                aria-modal="true"
                className={styles.removeConfirmDialog}
                role="alertdialog"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <h4 className={styles.removeConfirmTitle} id="block-map-hash-remove-confirm-title">
                  Remover entrada?
                </h4>
                <p className={styles.removeConfirmLead}>
                  Deseja remover esta entrada do parâmetro <strong>{parameterTitle}</strong>?
                </p>
                <p className={styles.removeConfirmPathLabel}>Caminho</p>
                <div
                  className={styles.removeConfirmPath}
                  id="block-map-hash-remove-confirm-path"
                  title={pendingRemoveEntry.key}
                >
                  {pendingRemoveEntry.key}
                </div>
                <div className={styles.removeConfirmActions}>
                  <button
                    className={styles.removeConfirmButton}
                    onClick={() => setRemoveConfirmKey(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className={[styles.removeConfirmButton, styles.removeConfirmButtonDanger].join(
                      ' ',
                    )}
                    onClick={confirmRemoveEntry}
                    type="button"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editDialog && editDialogEntry && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.removeConfirmBackdrop}
              role="presentation"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setEditDialog(null)
                }
              }}
            >
              <div
                aria-labelledby="block-map-hash-edit-title"
                aria-modal="true"
                className={styles.removeConfirmDialog}
                role="dialog"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <h4 className={styles.removeConfirmTitle} id="block-map-hash-edit-title">
                  Editar entrada
                </h4>
                <p className={styles.removeConfirmLead}>
                  Índice <strong>{editDialog.index}</strong> · parâmetro{' '}
                  <strong>{parameterTitle}</strong>
                </p>
                <p className={styles.removeConfirmPathLabel}>Entrada actual</p>
                <div className={styles.removeConfirmPath} title={editDialogEntry.key}>
                  {editDialogEntry.key}
                </div>
                <p className={styles.removeConfirmPathLabel}>Novo caminho</p>
                <input
                  ref={editDialogInputRef}
                  aria-label="Novo caminho da entrada"
                  autoComplete="off"
                  className={styles.editDialogInput}
                  spellCheck={false}
                  type="text"
                  value={editDialog.draft}
                  onChange={(event) =>
                    setEditDialog((current) =>
                      current ? { ...current, draft: event.target.value } : null,
                    )
                  }
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applyEditDialog()
                    }
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                />
                <div className={styles.removeConfirmActions}>
                  <button
                    className={styles.removeConfirmButton}
                    onClick={() => setEditDialog(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className={[styles.removeConfirmButton, styles.removeConfirmButtonPrimary].join(
                      ' ',
                    )}
                    onClick={applyEditDialog}
                    type="button"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <MapHashStructurePicker
        catalog={catalog}
        onClose={() => setStructurePickerOpen(false)}
        onConfirm={applyStructureChoice}
        open={structurePickerOpen}
        parameterKind={parameterKind}
        parameterTitle={parameterTitle}
      />

      <ElementRemovalPicker
        confirmLabel="Remover"
        dialogSubtitle={
          <>
            Escolha a entrada a remover de <strong>{parameterTitle}</strong>.
          </>
        }
        dialogTitle="Remover entrada"
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
