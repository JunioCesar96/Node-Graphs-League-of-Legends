import type { PointerEvent as ReactPointerEvent } from 'react'
import { useState } from 'react'

import { EmbedItem } from '@/components/molecules/EmbedItem'
import { StructureViewToggle } from '@/components/atoms/StructureViewToggle'
import type { InternalStructureDefinition, List2EmbedDefinition } from '@/core/nodeSchema'
import { clampSelectedIndex } from '@/core/elementViewState'
import { populatedSlotsForList2EmbedInstance } from '@/core/list2EmbedSlots'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  StructureIndexPicker,
  type StructureIndexPickerItem,
} from '@/components/molecules/StructureIndexPicker'
import type { StructureBlockViewProps } from '@/components/molecules/structureBlockViewProps'

import styles from './ListEmbedItem.module.css'

type List2EmbedItemProps = StructureBlockViewProps & {
  activeSlotId?: string
  canAdd?: boolean
  canRemove?: boolean
  canvasNodeId: string
  list2Embed: List2EmbedDefinition
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

export function List2EmbedItem({
  activeSlotId,
  canAdd = false,
  canRemove = false,
  canvasNodeId,
  list2Embed,
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
}: List2EmbedItemProps) {
  const [indexPickerOpen, setIndexPickerOpen] = useState(false)
  const isEmpty = list2Embed.instances.length === 0
  const isCompact = viewMode === 'compact'
  const safeIndex = clampSelectedIndex(list2Embed.instances.length, selectedIndex)
  const visibleInstances =
    isCompact && list2Embed.instances.length > 0
      ? [list2Embed.instances[safeIndex]!]
      : list2Embed.instances

  const indexPickerItems: StructureIndexPickerItem[] = list2Embed.instances.map(
    (instance, index) => ({
      index,
      label: instance.title,
    }),
  )

  return (
    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}>
      <div className={styles.blockHeader}>
        <h4 className={styles.blockTitle} title={list2Embed.title}>
          {list2Embed.title}
        </h4>
        <div className={styles.blockActions}>
          {onViewModeChange ? (
            <StructureViewToggle mode={viewMode} onModeChange={onViewModeChange} />
          ) : null}
          <button
            aria-label={`Remover instância de ${list2Embed.title}`}
            className={styles.removeButton}
            disabled={!canRemove}
            onClick={onRemoveClick}
            title={canRemove ? 'Remover instância' : 'Nenhuma instância para remover'}
            type="button"
          >
            −
          </button>
          <button
            aria-label={`Adicionar instância em ${list2Embed.title}`}
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
            <EmbedItem
              activeSlotId={activeSlotId}
              canAdd={false}
              canRemove={Boolean(onRemoveInstanceClick)}
              canvasNodeId={canvasNodeId}
              embed={instance}
              key={instance.id}
              nested
              onRemoveClick={
                onRemoveInstanceClick ? () => onRemoveInstanceClick(instance.id) : undefined
              }
              onOutputWireKeyboard={onOutputWireKeyboard}
              onOutputWirePointerCancel={onOutputWirePointerCancel}
              onOutputWirePointerDown={onOutputWirePointerDown}
              onOutputWirePointerMove={onOutputWirePointerMove}
              onOutputWirePointerUp={onOutputWirePointerUp}
              wirelessOutputLinks={wirelessOutputLinks}
              wirelessPortHandlers={wirelessPortHandlers}
              wirelessPortPulse={wirelessPortPulse}
              slots={populatedSlotsForList2EmbedInstance(instance)}
            />
          ))}
        </ul>
      ) : null}

      {isCompact && list2Embed.instances.length > 0 && onSelectedIndexChange ? (
        <StructureIndexPager
          onCounterClick={() => setIndexPickerOpen(true)}
          onSelectedIndexChange={onSelectedIndexChange}
          selectedIndex={safeIndex}
          total={list2Embed.instances.length}
        />
      ) : null}

      <StructureIndexPicker
        items={indexPickerItems}
        onClose={() => setIndexPickerOpen(false)}
        onSelect={(index) => onSelectedIndexChange?.(index)}
        open={indexPickerOpen}
        selectedIndex={safeIndex}
        title={`Escolher instância — ${list2Embed.title}`}
      />
    </li>
  )
}
