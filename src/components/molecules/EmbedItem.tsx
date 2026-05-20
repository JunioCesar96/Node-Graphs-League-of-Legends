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
import { elementTitleDoubleClickRetractProps } from '@/core/elementTitleInteraction'
import { canvasContextElementProps } from '@/core/canvasContextMenuAttributes'
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
  /** Quando true, não renderiza cabeçalho (ex.: instância dentro de LIST2). */
  nested?: boolean
}

function renderSlotRow(
  slot: InternalStructureDefinition,
  embedId: string,
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
    <li
      className={styles.slot}
      key={slot.id}
      {...canvasContextElementProps({
        nodeId: canvasNodeId,
        kind: 'embedSlot',
        elementId: slot.id,
        embedId,
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
          wirelessPulse={
            elementViewKey ? isRetractedElementPulsing(wirelessPortPulse, elementViewKey) : false
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
          {visibleSlots.map((slot) => renderSlotRow(slot, embed.id, embed.title, slotProps))}
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
