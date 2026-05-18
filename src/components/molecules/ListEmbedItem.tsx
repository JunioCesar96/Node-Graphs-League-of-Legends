import type { PointerEvent as ReactPointerEvent } from 'react'



import { Port } from '@/components/atoms/Port'

import type { InternalStructureDefinition, ListEmbedDefinition } from '@/core/nodeSchema'



import styles from './ListEmbedItem.module.css'



type ListEmbedItemProps = {

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

}: ListEmbedItemProps) {

  const isEmpty = slots.length === 0



  return (

    <li className={`${styles.block} ${isEmpty ? styles.blockEmpty : ''}`}>

      <div className={styles.blockHeader}>

        <h4 className={styles.blockTitle} title={listEmbed.title}>

          {listEmbed.title}

        </h4>

        <div className={styles.blockActions}>

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

              />

            </li>

          ))}

        </ul>

      ) : null}

    </li>

  )

}


