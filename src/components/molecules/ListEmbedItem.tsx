import type { PointerEvent as ReactPointerEvent } from 'react'
import { useState } from 'react'

import { Port } from '@/components/atoms/Port'
import { ElementRetractedBar } from '@/components/molecules/ElementRetractedBar'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import {
  isRetractedElementPulsing,
  isWirelessPortPulsing,
  toWirelessPortLinkProps,
  type WirelessPortHandlers,
  type WirelessPortLink,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { clampSelectedIndex } from '@/core/elementViewState'
import { canvasContextElementProps } from '@/core/canvasContextMenuAttributes'
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
  viewMode = 'list',
  selectedIndex = 0,
  onViewModeChange,
  onSelectedIndexChange,
  retracted = false,
  onExpandFromRetracted,
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
          wirelessPulse={
            elementViewKey ? isRetractedElementPulsing(wirelessPortPulse, elementViewKey) : false
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
        <h4 className={styles.blockTitle} title={listEmbed.title}>
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
            <li
              className={styles.slot}
              key={slot.id}
              {...canvasContextElementProps({
                nodeId: canvasNodeId,
                kind: 'listEmbedSlot',
                elementId: slot.id,
                listEmbedId: listEmbed.id,
              })}
            >
              <span className={styles.slotName} title={slot.name}>
                {slot.name}
              </span>
              <Port
                active={slot.id === activeSlotId}
                direction="output"
                graphInternalStructureId={slot.id}
                graphNodeId={canvasNodeId}
                graphPortKind="output"
                label={`Start link from ${listEmbed.title} · ${slot.name}`}
                onWireActivateKeyboard={
                  onOutputWireKeyboard ? () => onOutputWireKeyboard(slot) : undefined
                }
                onWirePointerCancel={
                  onOutputWirePointerCancel
                    ? (event) => onOutputWirePointerCancel(slot, event)
                    : undefined
                }
                onWirePointerDown={
                  onOutputWirePointerDown ? (event) => onOutputWirePointerDown(slot, event) : undefined
                }
                onWirePointerMove={
                  onOutputWirePointerMove ? (event) => onOutputWirePointerMove(slot, event) : undefined
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
            </li>
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
