import type { PointerEvent as ReactPointerEvent } from 'react'

import { PointerItem } from '@/components/molecules/PointerItem'
import type { InternalStructureDefinition, List2PointerDefinition } from '@/core/nodeSchema'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'

import styles from './ListEmbedItem.module.css'

type List2PointerItemProps = {
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
}: List2PointerItemProps) {
  const isEmpty = list2Pointer.instances.length === 0

  return (
    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}>
      <div className={styles.blockHeader}>
        <h4 className={styles.blockTitle} title={list2Pointer.title}>
          {list2Pointer.title}
        </h4>
        <div className={styles.blockActions}>
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

      {list2Pointer.instances.length > 0 ? (
        <ul className={styles.slots}>
          {list2Pointer.instances.map((instance) => (
            <PointerItem
              activeSlotId={activeSlotId}
              canAdd={false}
              canRemove={Boolean(onRemoveInstanceClick)}
              canvasNodeId={canvasNodeId}
              key={instance.id}
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
              pointer={instance}
              slots={populatedSlotsForList2PointerInstance(instance)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
