import type { PointerEvent as ReactPointerEvent } from 'react'
import { useState } from 'react'

import { Port } from '@/components/atoms/Port'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import {
  isWirelessPortPulsing,
  toWirelessPortLinkProps,
  type WirelessPortHandlers,
  type WirelessPortLink,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { clampSelectedIndex } from '@/core/elementViewState'
import type { InternalStructureDefinition, PointerDefinition } from '@/core/nodeSchema'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './PointerItem.module.css'

type PointerItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  pointer: PointerDefinition
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
  nested?: boolean
}

export function PointerItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  pointer,
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
  nested = false,
}: PointerItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = slots.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(slots.length, selectedIndex)
  const visibleSlots = isCompact && slots.length > 0 ? [slots[safeIndex]!] : slots

  const indexPickerItems: StructureIndexPickerItem[] = slots.map((slot, index) => ({
    index,
    label: slot.name,
  }))

  return (
    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}>
      {!nested ? (
        <div className={styles.blockHeader}>
          <h4 className={styles.blockTitle} title={pointer.title}>
            {pointer.title}
          </h4>
          <div className={styles.blockActions}>
            {onViewModeChange ? (
              <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
            ) : null}
            <button
              aria-label={`Remover estrutura de ${pointer.title}`}
              className={styles.removeButton}
              disabled={!canRemove}
              onClick={onRemoveClick}
              title={canRemove ? 'Remover estrutura interna' : 'Nenhuma estrutura para remover'}
              type="button"
            >
              −
            </button>
            <button
              aria-label={`Adicionar estrutura em ${pointer.title}`}
              className={styles.addButton}
              disabled={!canAdd}
              onClick={onAddClick}
              title={canAdd ? 'Adicionar estrutura interna' : 'Já existe uma estrutura neste bloco'}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {visibleSlots.length > 0 ? (
        <ul className={styles.slots}>
          {visibleSlots.map((slot) => (
            <li className={styles.slot} key={slot.id}>
              <span className={styles.slotName} title={slot.name}>
                {slot.name}
              </span>
              <Port
                active={slot.id === activeSlotId}
                direction="output"
                graphInternalStructureId={slot.id}
                graphNodeId={canvasNodeId}
                graphPortKind="output"
                label={`Start link from ${pointer.title} · ${slot.name}`}
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

      {isCompact && !nested && slots.length > 1 && onSelectedIndexChange ? (
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
        title={`Escolher índice — ${pointer.title}`}
      />
    </li>
  )
}
