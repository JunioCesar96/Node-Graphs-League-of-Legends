import type { PointerEvent as ReactPointerEvent } from 'react'

import { Port } from '@/components/atoms/Port'
import type { EmbedDefinition, InternalStructureDefinition } from '@/core/nodeSchema'

import styles from './EmbedItem.module.css'

type EmbedItemProps = {
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
}: EmbedItemProps) {
  const isEmpty = slots.length === 0

  return (
    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}>
      <div className={styles.blockHeader}>
        <h4 className={styles.blockTitle} title={embed.title}>
          {embed.title}
        </h4>
        <div className={styles.blockActions}>
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

      {slots.length > 0 ? (
        <ul className={styles.slots}>
          {slots.map((slot) => (
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
                label={`Start link from ${embed.title} · ${slot.name}`}
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
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
