import type { PointerEvent as ReactPointerEvent } from 'react'
import { useState } from 'react'

import { ElementRetractedBar } from '@/components/molecules/ElementRetractedBar'
import { StructureOutputSlotRow } from '@/components/molecules/StructureOutputSlotRow'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import {
  retractedElementPulseVariant,
  type WirelessPortHandlers,
  type WirelessPortLink,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { clampSelectedIndex } from '@/core/elementViewState'
import { elementTitleDoubleClickRetractProps } from '@/core/elementTitleInteraction'
import { canvasContextElementProps } from '@/core/canvasContextMenuAttributes'
import type { OutputSlotPeerActions } from '@/core/outputSlotPeerActions'
import type { InternalStructureDefinition, ListEmbedDefinition } from '@/core/nodeSchema'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './ListEmbedItem.module.css'

type ListEmbedItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  listEmbed: ListEmbedDefinition
  slots: InternalStructureDefinition[]
  onAddClick?: () => void
  onRemoveClick?: () => void
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
  outputSlotPeerActions?: OutputSlotPeerActions
}

export function ListEmbedItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  listEmbed,
  slots,
  onAddClick,
  onRemoveClick,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  wirelessOutputLinks,
  wirelessPortHandlers,
  wirelessPortPulse,
  outputSlotPeerActions,
  viewMode = 'list',
  selectedIndex = 0,
  onViewModeChange,
  onSelectedIndexChange,
  retracted = false,
  onExpandFromRetracted,
  onRetractFromTitle,
  elementViewKey,
}: ListEmbedItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = slots.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(slots.length, selectedIndex)
  const visibleSlots = isCompact && slots.length > 0 ? [slots[safeIndex]!] : slots

  const indexPickerItems: StructureIndexPickerItem[] = slots.map((slot, index) => ({
    index,
    label: slot.name,
  }))

  const contextProps = canvasContextElementProps({
    nodeId: canvasNodeId,
    kind: 'listEmbedBlock',
    elementId: listEmbed.id,
    listEmbedId: listEmbed.id,
  })

  if (retracted && onExpandFromRetracted) {
    return (
      <li className={`${styles.block} ${styles.blockRetracted}`} {...contextProps}>
        <ElementRetractedBar
          title={listEmbed.title}
          typeLabel="listEmbed"
          onExpand={onExpandFromRetracted}
          pulseVariant={
            elementViewKey ? retractedElementPulseVariant(wirelessPortPulse, elementViewKey) : undefined
          }
        />
      </li>
    )
  }

  return (
    <li
      className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}
      {...contextProps}
    >
      <div className={styles.blockHeader}>
        <h4
          className={styles.blockTitle}
          title={listEmbed.title}
            {...elementTitleDoubleClickRetractProps(onRetractFromTitle)}
          >
          {listEmbed.title}
        </h4>
        <div className={styles.blockActions}>
          {onViewModeChange ? (
            <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
          ) : null}
          <button
            aria-label={`Remover ${listEmbed.title}`}
            className={styles.removeButton}
            disabled={!canRemove}
            onClick={onRemoveClick}
            title={canRemove ? `Remover ${listEmbed.title}` : 'Nenhum item para remover'}
            type="button"
          >
            −
          </button>
          <button
            aria-label={`Adicionar ${listEmbed.title}`}
            className={styles.addButton}
            disabled={!canAdd}
            onClick={onAddClick}
            title={canAdd ? `Adicionar ${listEmbed.title}` : 'Sem tipos disponíveis no catálogo'}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      {visibleSlots.length > 0 ? (
        <ul className={styles.slots}>
          {visibleSlots.map((slot) => (
            <StructureOutputSlotRow
              key={slot.id}
              activeSlotId={activeSlotId}
              canvasNodeId={canvasNodeId}
              liProps={canvasContextElementProps({
                nodeId: canvasNodeId,
                kind: 'listEmbedSlot',
                elementId: slot.id,
                listEmbedId: listEmbed.id,
              })}
              outputSlotPeerActions={outputSlotPeerActions}
              portLabel={`Start link from ${listEmbed.title} · ${slot.name}`}
              slot={slot}
              slotNameClassName={styles.slotName}
              onOutputWireKeyboard={onOutputWireKeyboard}
              onOutputWirePointerCancel={onOutputWirePointerCancel}
              onOutputWirePointerDown={onOutputWirePointerDown}
              onOutputWirePointerMove={onOutputWirePointerMove}
              onOutputWirePointerUp={onOutputWirePointerUp}
              wirelessOutputLinks={wirelessOutputLinks}
              wirelessPortHandlers={wirelessPortHandlers}
              wirelessPortPulse={wirelessPortPulse}
            />
          ))}
        </ul>
      ) : null}

      {isCompact && slots.length > 0 && onSelectedIndexChange ? (
        <StructureIndexPager
          onCounterClick={() => setIndexPickerOpen(true)}
          onSelectedIndexChange={onSelectedIndexChange}
          selectedIndex={safeIndex}
          total={slots.length}
        />
      ) : null}

      <StructureIndexPicker
        items={indexPickerItems}
        onClose={() => setIndexPickerOpen(false)}
        onSelect={(index) => onSelectedIndexChange?.(index)}
        open={indexPickerOpen}
        selectedIndex={safeIndex}
        title={`Escolher índice — ${listEmbed.title}`}
      />
    </li>
  )
}
