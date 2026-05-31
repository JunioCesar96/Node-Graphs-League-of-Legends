import type { PointerEvent, PointerEventHandler } from 'react'
import { useMemo } from 'react'

import { BlockParameterRow } from '@/components/molecules/BlockParameterRow'
import { StructureCardResizeHandles } from '@/components/molecules/StructureCardResizeHandles'
import { BlockSlot } from '@/components/atoms/BlockSlot'
import { BlockTypeDivider } from '@/components/atoms/BlockTypeDivider'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  BLOCK_CARD_WIDTH,
  blockHeaderSlotId,
  blockParameterSlotId,
  isBlockPointerSourcePath,
} from '@/core/blockSchema'
import {
  STRUCTURE_CARD_MAX_WIDTH,
  resolveBlockCardWidth,
} from '@/core/structureCardLayout'
import { blockTypeDefinitionById } from '@/core/blockStructureRegistry'
import type { BlockWirelessNodeDisplay, BlockSlotWirelessLink } from '@/core/blockConnectionDisplay'
import { isBlockSlotPulsing } from '@/core/blockConnectionDisplay'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'

import styles from './BlockCard.module.css'

type BlockCardProps = {
  canvasNode: CanvasNode
  scene: CanvasScene
  selected?: boolean
  interactionLocked?: boolean
  activeBlockSlotId?: string
  onUpdateBlockParameter: (paramId: string, value: string) => void
  onBlockOutputPointerDown?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockOutputPointerUp?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockOutputPointerMove?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockHeaderOutputPointerDown?: (
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockHeaderOutputPointerUp?: (
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockHeaderInputPointerUp?: (
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockInputPointerUp?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  blockWirelessDisplay?: BlockWirelessNodeDisplay
  blockWirelessPulseSlotId?: string
  onBlockSlotWirelessHoverStart?: (slotId: string, link: BlockSlotWirelessLink) => void
  onBlockSlotWirelessHoverEnd?: () => void
  onBlockSlotCycleRouting?: (connectionId: string) => void
  canvasScale?: number
  structureCardResizeModifierActive?: boolean
  onStructureCardResize?: (payload: { width: number; positionX: number }) => void
}

export function BlockCard({
  canvasNode,
  scene,
  selected = false,
  interactionLocked = false,
  activeBlockSlotId,
  onUpdateBlockParameter,
  onBlockOutputPointerDown,
  onBlockOutputPointerUp,
  onBlockOutputPointerMove,
  onBlockHeaderOutputPointerDown,
  onBlockHeaderOutputPointerUp,
  onBlockHeaderInputPointerUp,
  onBlockInputPointerUp,
  blockWirelessDisplay,
  blockWirelessPulseSlotId,
  onBlockSlotWirelessHoverStart,
  onBlockSlotWirelessHoverEnd,
  onBlockSlotCycleRouting,
  canvasScale = 1,
  structureCardResizeModifierActive = false,
  onStructureCardResize,
}: BlockCardProps) {
  const structure = canvasNode.blockStructure
  const cardWidth = resolveBlockCardWidth(canvasNode)
  const typeDef = useMemo(
    () => (structure ? blockTypeDefinitionById(structure.blockType) : undefined),
    [structure],
  )

  if (!structure) {
    return null
  }

  const headerOutputIndex = typeDef?.headerSlots.findIndex((slot) => slot.startsWith('output[')) ?? -1
  const headerInputIndex = typeDef?.headerSlots.findIndex((slot) => slot.startsWith('input[')) ?? -1
  const headerOutputSlotId =
    headerOutputIndex >= 0 ? blockHeaderSlotId(structure.blockType, headerOutputIndex) : undefined
  const headerInputSlotId =
    headerInputIndex >= 0 ? blockHeaderSlotId(structure.blockType, headerInputIndex) : undefined

  return (
    <article
      className={[styles.card, selected ? styles.selected : '', interactionLocked ? styles.locked : '']
        .filter(Boolean)
        .join(' ')}
      data-block-card="1"
      style={{ width: `${cardWidth}px` }}
    >
      <StructureCardResizeHandles
        disabled={interactionLocked}
        maxWidth={STRUCTURE_CARD_MAX_WIDTH}
        minWidth={BLOCK_CARD_WIDTH}
        resizeModifierActive={structureCardResizeModifierActive}
        scale={canvasScale}
        startPositionX={canvasNode.position.x}
        width={cardWidth}
        onResize={(payload) => onStructureCardResize?.(payload)}
      />
      <header className={styles.header}>
        {headerInputIndex >= 0 && headerInputSlotId ? (
          <BlockSlot
            variant="in"
            ariaLabel="Entrada do bloco"
            disabled={interactionLocked}
            linked={Boolean(blockWirelessDisplay?.slots.get(headerInputSlotId))}
            pulsing={isBlockSlotPulsing(
              blockWirelessPulseSlotId
                ? { nodeId: canvasNode.id, slotId: blockWirelessPulseSlotId }
                : null,
              canvasNode.id,
              headerInputSlotId,
            )}
            slotId={headerInputSlotId}
            nodeId={canvasNode.id}
            onPointerUp={(event) => onBlockHeaderInputPointerUp?.(headerInputSlotId, event)}
            onPointerEnter={() => {
              const link = blockWirelessDisplay?.slots.get(headerInputSlotId)
              if (link) {
                onBlockSlotWirelessHoverStart?.(headerInputSlotId, link)
              }
            }}
            onPointerLeave={onBlockSlotWirelessHoverEnd}
          />
        ) : (
          <span />
        )}
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>{structure.blockName}</h3>
        </div>
        {headerOutputIndex >= 0 && headerOutputSlotId ? (
          <BlockSlot
            variant="out"
            ariaLabel="Saída do bloco"
            disabled={interactionLocked}
            active={activeBlockSlotId === headerOutputSlotId}
            linked={Boolean(blockWirelessDisplay?.slots.get(headerOutputSlotId))}
            pulsing={isBlockSlotPulsing(
              blockWirelessPulseSlotId
                ? { nodeId: canvasNode.id, slotId: blockWirelessPulseSlotId }
                : null,
              canvasNode.id,
              headerOutputSlotId,
            )}
            slotId={headerOutputSlotId}
            nodeId={canvasNode.id}
            onPointerDown={(event) => onBlockHeaderOutputPointerDown?.(headerOutputSlotId, event)}
            onPointerUp={(event) => onBlockHeaderOutputPointerUp?.(headerOutputSlotId, event)}
            onPointerEnter={() => {
              const link = blockWirelessDisplay?.slots.get(headerOutputSlotId)
              if (link) {
                onBlockSlotWirelessHoverStart?.(headerOutputSlotId, link)
              }
            }}
            onPointerLeave={onBlockSlotWirelessHoverEnd}
          />
        ) : (
          <span />
        )}
      </header>

      <BlockTypeDivider color={typeDef?.color ?? '#40ff56'} />

      <div
        className={styles.body}
        data-params-layout={canvasNode.structureCardParamsExpanded ? 'expanded' : 'compact'}
      >
        {structure.parameters.map((parameter) => {
          const hasOutput = Boolean(parameter.slotRules?.outputs?.length)
          const hasInput = Boolean(parameter.slotRules?.inputs?.length)
          const value = readBlockParameterDisplayValue(scene, canvasNode, structure, parameter.idParameter)

          const outputSlotId = blockParameterSlotId(parameter.idParameter, 'output')
          const inputSlotId = blockParameterSlotId(parameter.idParameter, 'input')

          return (
            <BlockParameterRow
              key={parameter.idParameter}
              parameter={parameter}
              value={value}
              interactionLocked={interactionLocked}
              hasInputSlot={hasInput}
              hasOutputSlot={hasOutput}
              hideValueInput={isBlockPointerSourcePath(parameter.sourcePath)}
              activeSlotId={activeBlockSlotId}
              inputSlotLink={blockWirelessDisplay?.slots.get(inputSlotId)}
              outputSlotLink={blockWirelessDisplay?.slots.get(outputSlotId)}
              pulseSlotId={blockWirelessPulseSlotId}
              canvasNodeId={canvasNode.id}
              onCommitValue={(next) => onUpdateBlockParameter(parameter.idParameter, next)}
              onInputPointerUp={(event) =>
                onBlockInputPointerUp?.(
                  parameter.idParameter,
                  inputSlotId,
                  event,
                )
              }
              onOutputPointerDown={(event) =>
                onBlockOutputPointerDown?.(
                  parameter.idParameter,
                  outputSlotId,
                  event,
                )
              }
              onOutputPointerUp={(event) =>
                onBlockOutputPointerUp?.(
                  parameter.idParameter,
                  outputSlotId,
                  event,
                )
              }
              onOutputPointerMove={(event) =>
                onBlockOutputPointerMove?.(
                  parameter.idParameter,
                  outputSlotId,
                  event,
                )
              }
              onSlotWirelessHoverStart={onBlockSlotWirelessHoverStart}
              onSlotWirelessHoverEnd={onBlockSlotWirelessHoverEnd}
              onSlotCycleRouting={onBlockSlotCycleRouting}
            />
          )
        })}
      </div>
    </article>
  )
}
