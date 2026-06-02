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
import type { EmbedDefinition, InternalStructureDefinition } from '@/core/nodeSchema'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './EmbedItem.module.css'

type EmbedContextOverride = Parameters<typeof canvasContextElementProps>[0]

type EmbedItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  contextOverride?: EmbedContextOverride
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
  outputSlotPeerActions?: OutputSlotPeerActions
  /** Quando true, não renderiza cabeçalho (ex.: instância dentro de LIST2). */
  nested?: boolean
}

export function EmbedItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  contextOverride,
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
  outputSlotPeerActions,
  viewMode = 'list',
  selectedIndex = 0,
  onViewModeChange,
  onSelectedIndexChange,
  nested = false,
  retracted = false,
  onExpandFromRetracted,
  onRetractFromTitle,
  elementViewKey,
}: EmbedItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = slots.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(slots.length, selectedIndex)

  const indexPickerItems: StructureIndexPickerItem[] = slots.map((slot, index) => ({
    index,
    label: slot.name,
  }))

  const visibleSlots = isCompact && slots.length > 0 ? [slots[safeIndex]!] : slots

  const contextProps = contextOverride
    ? canvasContextElementProps(contextOverride)
    : nested
      ? {}
      : canvasContextElementProps({
          nodeId: canvasNodeId,
          kind: 'embedBlock',
          elementId: embed.id,
          embedId: embed.id,
        })

  if (retracted && onExpandFromRetracted && !nested) {
    return (
      <li className={`${styles.block} ${styles.blockRetracted}`} {...contextProps}>
        <ElementRetractedBar
          title={embed.title}
          typeLabel="embed"
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
      className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''} ${nested ? styles.blockNested : ''}`}
      {...contextProps}
    >
      {!nested ? (
        <div className={styles.blockHeader}>
          <h4
            className={styles.blockTitle}
            title={embed.title}
            {...elementTitleDoubleClickRetractProps(onRetractFromTitle)}
          >
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
          {visibleSlots.map((slot) => (
            <StructureOutputSlotRow
              key={slot.id}
              activeSlotId={activeSlotId}
              canvasNodeId={canvasNodeId}
              liProps={canvasContextElementProps({
                nodeId: canvasNodeId,
                kind: 'embedSlot',
                elementId: slot.id,
                embedId: embed.id,
              })}
              outputSlotPeerActions={outputSlotPeerActions}
              portLabel={`Start link from ${embed.title} · ${slot.name}`}
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
