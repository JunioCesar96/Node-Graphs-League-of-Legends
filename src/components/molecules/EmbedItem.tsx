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
import type { EmbedDefinition, InternalStructureDefinition } from '@/core/nodeSchema'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './EmbedItem.module.css'

type EmbedItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  embed: EmbedDefinition
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
  /** Quando true, não renderiza cabeçalho (ex.: instância dentro de LIST2). */
  nested?: boolean
}

function renderSlotRow(
  slot: InternalStructureDefinition,
  embedTitle: string,
  props: Pick<
    EmbedItemProps,
    | 'activeSlotId'
    | 'canvasNodeId'
    | 'onOutputWireKeyboard'
    | 'onOutputWirePointerCancel'
    | 'onOutputWirePointerDown'
    | 'onOutputWirePointerMove'
    | 'onOutputWirePointerUp'
    | 'wirelessOutputLinks'
    | 'wirelessPortHandlers'
    | 'wirelessPortPulse'
  >,
) {
  const {
    activeSlotId,
    canvasNodeId,
    onOutputWireKeyboard,
    onOutputWirePointerCancel,
    onOutputWirePointerDown,
    onOutputWirePointerMove,
    onOutputWirePointerUp,
    wirelessOutputLinks,
    wirelessPortHandlers,
    wirelessPortPulse,
  } = props

  return (
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
        label={`Start link from ${embedTitle} · ${slot.name}`}
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
  )
}

export function EmbedItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  embed,
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
}: EmbedItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = slots.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(slots.length, selectedIndex)
  const slotProps = {
    activeSlotId,
    canvasNodeId,
    onOutputWireKeyboard,
    onOutputWirePointerCancel,
    onOutputWirePointerDown,
    onOutputWirePointerMove,
    onOutputWirePointerUp,
    wirelessOutputLinks,
    wirelessPortHandlers,
    wirelessPortPulse,
  }

  const indexPickerItems: StructureIndexPickerItem[] = slots.map((slot, index) => ({
    index,
    label: slot.name,
  }))

  const visibleSlots = isCompact && slots.length > 0 ? [slots[safeIndex]!] : slots

  return (
    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''} ${nested ? styles.blockNested : ''}`}>
      {!nested ? (
        <div className={styles.blockHeader}>
          <h4 className={styles.blockTitle} title={embed.title}>
            {embed.title}
          </h4>
          <div className={styles.blockActions}>
            {onViewModeChange ? (
              <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
            ) : null}
            <button
              aria-label={`Remover estrutura de ${embed.title}`}
              className={styles.removeButton}
              disabled={!canRemove}
              onClick={onRemoveClick}
              title={canRemove ? 'Remover estrutura interna' : 'Nenhuma estrutura para remover'}
              type="button"
            >
              −
            </button>
            <button
              aria-label={`Adicionar estrutura em ${embed.title}`}
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
          {visibleSlots.map((slot) => renderSlotRow(slot, embed.title, slotProps))}
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
        title={`Escolher índice — ${embed.title}`}
      />
    </li>
  )
}
