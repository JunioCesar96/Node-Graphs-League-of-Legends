import type { PointerEvent as ReactPointerEvent } from 'react'
import { useState } from 'react'

import { PointerItem } from '@/components/molecules/PointerItem'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import { ElementRetractedBar } from '@/components/molecules/ElementRetractedBar'
import { canvasContextElementProps } from '@/core/canvasContextMenuAttributes'
import type { InternalStructureDefinition, List2PointerDefinition } from '@/core/nodeSchema'
import { isRetractedElementPulsing } from '@/core/connectionDisplay'
import { clampSelectedIndex } from '@/core/elementViewState'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './ListEmbedItem.module.css'

type List2PointerItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  list2Pointer: List2PointerDefinition
  onAddClick?: () => void
  onRemoveClick?: () => void
  onRemoveInstanceClick?: (instanceId: string) => void
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
  wirelessOutputLinks?: ReadonlyMap<string, import('@/core/connectionDisplay').WirelessPortLink>
  wirelessPortHandlers?: import('@/core/connectionDisplay').WirelessPortHandlers
  wirelessPortPulse?: import('@/core/connectionDisplay').WirelessPortPulseTarget
}

export function List2PointerItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  list2Pointer,
  onAddClick,
  onRemoveClick,
  onRemoveInstanceClick,
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
}: List2PointerItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = list2Pointer.instances.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(list2Pointer.instances.length, selectedIndex)
  const visibleInstances =
    isCompact && list2Pointer.instances.length > 0
      ? [list2Pointer.instances[safeIndex]!]
      : list2Pointer.instances

  const indexPickerItems: StructureIndexPickerItem[] = list2Pointer.instances.map(
    (instance, index) => ({
      index,
      label: instance.title,
    }),
  )

  const contextProps = canvasContextElementProps({
    nodeId: canvasNodeId,
    kind: 'list2PointerBlock',
    elementId: list2Pointer.id,
    list2PointerId: list2Pointer.id,
  })

  if (retracted && onExpandFromRetracted) {
    return (
      <li className={`${styles.block} ${styles.blockRetracted}`} {...contextProps}>
        <ElementRetractedBar
          title={list2Pointer.title}
          typeLabel="list2Pointer"
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
        <h4 className={styles.blockTitle} title={list2Pointer.title}>
          {list2Pointer.title}
        </h4>
        <div className={styles.blockActions}>
          {onViewModeChange ? (
            <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
          ) : null}
          <button
            aria-label={`Remover instância de ${list2Pointer.title}`}
            className={styles.removeButton}
            disabled={!canRemove}
            onClick={onRemoveClick}
            title={canRemove ? 'Remover instância' : 'Nenhuma instância para remover'}
            type="button"
          >
            −
          </button>
          <button
            aria-label={`Adicionar instância em ${list2Pointer.title}`}
            className={styles.addButton}
            disabled={!canAdd}
            onClick={onAddClick}
            title={canAdd ? 'Adicionar instância' : 'Sem tipos no catálogo'}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      {visibleInstances.length > 0 ? (
        <ul className={styles.slots}>
          {visibleInstances.map((instance) => (
            <PointerItem
              activeSlotId={activeSlotId}
              canAdd={false}
              canRemove={Boolean(onRemoveInstanceClick)}
              canvasNodeId={canvasNodeId}
              contextOverride={{
                nodeId: canvasNodeId,
                kind: 'list2PointerInstance',
                elementId: instance.id,
                list2PointerId: list2Pointer.id,
                instanceId: instance.id,
              }}
              nested
              onRemoveClick={
                onRemoveInstanceClick ? () => onRemoveInstanceClick(instance.id) : undefined
              }
              onOutputWireKeyboard={onOutputWireKeyboard}
              onOutputWirePointerCancel={onOutputWirePointerCancel}
              onOutputWirePointerDown={onOutputWirePointerDown}
              onOutputWirePointerMove={onOutputWirePointerMove}
              onOutputWirePointerUp={onOutputWirePointerUp}
              pointer={instance}
              key={instance.id}
              wirelessOutputLinks={wirelessOutputLinks}
              wirelessPortHandlers={wirelessPortHandlers}
              wirelessPortPulse={wirelessPortPulse}
              slots={populatedSlotsForList2PointerInstance(instance)}
            />
          ))}
        </ul>
      ) : null}

      {isCompact && list2Pointer.instances.length > 0 && onSelectedIndexChange ? (
        <StructureIndexPager
          onCounterClick={() => setIndexPickerOpen(true)}
          onSelectedIndexChange={onSelectedIndexChange}
          selectedIndex={safeIndex}
          total={list2Pointer.instances.length}
        />
      ) : null}

      <StructureIndexPicker
        items={indexPickerItems}
        onClose={() => setIndexPickerOpen(false)}
        onSelect={(index) => onSelectedIndexChange?.(index)}
        open={indexPickerOpen}
        selectedIndex={safeIndex}
        title={`Escolher instância — ${list2Pointer.title}`}
      />
    </li>
  )
}
