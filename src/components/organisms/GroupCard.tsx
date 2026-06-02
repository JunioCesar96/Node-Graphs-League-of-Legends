import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'
import { useMemo } from 'react'

import { GroupParameterRow } from '@/components/molecules/GroupParameterRow'
import { StructureCardResizeHandles } from '@/components/molecules/StructureCardResizeHandles'
import { GroupSlot } from '@/components/atoms/GroupSlot'
import { GroupTypeDivider } from '@/components/atoms/GroupTypeDivider'
import { GroupTypeIcon } from '@/components/atoms/GroupTypeIcon'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { GROUP_CARD_WIDTH, groupHeaderSlotId, groupParameterSlotId, isGroupPointerSourcePath } from '@/core/groupSchema'
import {
  STRUCTURE_CARD_MAX_WIDTH,
  isStructureCardDragTarget,
  resolveGroupCardWidth,
} from '@/core/structureCardLayout'
import { groupTypeDefinitionById } from '@/core/groupStructureRegistry'
import type { GroupWirelessNodeDisplay, GroupSlotWirelessLink } from '@/core/groupConnectionDisplay'
import { isGroupSlotPulsing } from '@/core/groupConnectionDisplay'
import { readGroupParameterDisplayValue } from '@/core/syncGroupToCode'

import styles from './GroupCard.module.css'

type GroupCardProps = {
  canvasNode: CanvasNode
  scene: CanvasScene
  selected?: boolean
  interactionLocked?: boolean
  activeGroupSlotId?: string
  onUpdateGroupParameter: (paramId: string, value: string) => void
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
  blockWirelessDisplay?: GroupWirelessNodeDisplay
  blockWirelessPulseSlotId?: string
  onGroupSlotWirelessHoverStart?: (slotId: string, link: GroupSlotWirelessLink) => void
  onGroupSlotWirelessHoverEnd?: () => void
  onGroupSlotCycleRouting?: (connectionId: string) => void
  canvasScale?: number
  structureCardResizeModifierActive?: boolean
  onStructureCardResize?: (payload: { width: number; positionX: number }) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
}

export function GroupCard({
  canvasNode,
  scene,
  selected = false,
  interactionLocked = false,
  activeGroupSlotId,
  onUpdateGroupParameter,
  onBlockOutputPointerDown,
  onBlockOutputPointerUp,
  onBlockOutputPointerMove,
  onBlockHeaderOutputPointerDown,
  onBlockHeaderOutputPointerUp,
  onBlockHeaderInputPointerUp,
  onBlockInputPointerUp,
  blockWirelessDisplay,
  blockWirelessPulseSlotId,
  onGroupSlotWirelessHoverStart,
  onGroupSlotWirelessHoverEnd,
  onGroupSlotCycleRouting,
  canvasScale = 1,
  structureCardResizeModifierActive = false,
  onStructureCardResize,
  onSelect,
  onStartDrag,
}: GroupCardProps) {
  const structure = canvasNode.groupStructure
  const cardWidth = resolveGroupCardWidth(canvasNode)
  const typeDef = useMemo(
    () => (structure ? groupTypeDefinitionById(structure.groupType) : undefined),
    [structure],
  )

  if (!structure) {
    return null
  }

  const headerOutputIndex = typeDef?.headerSlots.findIndex((slot) => slot.startsWith('output[')) ?? -1
  const headerInputIndex = typeDef?.headerSlots.findIndex((slot) => slot.startsWith('input[')) ?? -1
  const headerOutputSlotId =
    headerOutputIndex >= 0 ? groupHeaderSlotId(structure.groupType, headerOutputIndex) : undefined
  const headerInputSlotId =
    headerInputIndex >= 0 ? groupHeaderSlotId(structure.groupType, headerInputIndex) : undefined

  return (
    <article
      className={[
        styles.card,
        selected ? styles.selected : '',
        interactionLocked ? styles.locked : '',
        onStartDrag && !interactionLocked ? styles.draggable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-group-card="1"
      style={{ width: `${cardWidth}px` }}
      onClick={(event) => {
        if (interactionLocked || !isStructureCardDragTarget(event.target)) {
          return
        }
        onSelect?.(event)
      }}
      onPointerDown={(event) => {
        if (interactionLocked || !onStartDrag || !isStructureCardDragTarget(event.target)) {
          return
        }
        onStartDrag(event)
      }}
    >
      <StructureCardResizeHandles
        disabled={interactionLocked}
        maxWidth={STRUCTURE_CARD_MAX_WIDTH}
        minWidth={GROUP_CARD_WIDTH}
        resizeModifierActive={structureCardResizeModifierActive}
        scale={canvasScale}
        startPositionX={canvasNode.position.x}
        width={cardWidth}
        onResize={(payload) => onStructureCardResize?.(payload)}
      />
      <header className={styles.header}>
        {headerInputIndex >= 0 && headerInputSlotId ? (
          <GroupSlot
            variant="in"
            ariaLabel="Entrada do bloco"
            disabled={interactionLocked}
            linked={Boolean(blockWirelessDisplay?.slots.get(headerInputSlotId))}
            pulsing={isGroupSlotPulsing(
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
                onGroupSlotWirelessHoverStart?.(headerInputSlotId, link)
              }
            }}
            onPointerLeave={onGroupSlotWirelessHoverEnd}
          />
        ) : (
          <span />
        )}
        <div className={styles.titleWrap}>
          {typeDef?.icon ? (
            <GroupTypeIcon icon={typeDef.icon} color={typeDef.color} className={styles.typeIcon} />
          ) : null}
          <h3 className={styles.title}>{structure.groupName}</h3>
        </div>
        {headerOutputIndex >= 0 && headerOutputSlotId ? (
          <GroupSlot
            variant="out"
            ariaLabel="Saída do bloco"
            disabled={interactionLocked}
            active={activeGroupSlotId === headerOutputSlotId}
            linked={Boolean(blockWirelessDisplay?.slots.get(headerOutputSlotId))}
            pulsing={isGroupSlotPulsing(
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
                onGroupSlotWirelessHoverStart?.(headerOutputSlotId, link)
              }
            }}
            onPointerLeave={onGroupSlotWirelessHoverEnd}
          />
        ) : (
          <span />
        )}
      </header>

      <GroupTypeDivider color={typeDef?.color ?? '#40ff56'} />

      <div
        className={styles.body}
        data-params-layout={canvasNode.structureCardParamsExpanded ? 'expanded' : 'compact'}
      >
        {structure.parameters.map((parameter) => {
          const hasOutput = Boolean(parameter.slotRules?.outputs?.length)
          const hasInput = Boolean(parameter.slotRules?.inputs?.length)
          const value = readGroupParameterDisplayValue(scene, canvasNode, structure, parameter.idParameter)

          const outputSlotId = groupParameterSlotId(parameter.idParameter, 'output')
          const inputSlotId = groupParameterSlotId(parameter.idParameter, 'input')

          return (
            <GroupParameterRow
              key={parameter.idParameter}
              parameter={parameter}
              value={value}
              interactionLocked={interactionLocked}
              hasInputSlot={hasInput}
              hasOutputSlot={hasOutput}
              hideValueInput={isGroupPointerSourcePath(parameter.sourcePath)}
              activeSlotId={activeGroupSlotId}
              inputSlotLink={blockWirelessDisplay?.slots.get(inputSlotId)}
              outputSlotLink={blockWirelessDisplay?.slots.get(outputSlotId)}
              pulseSlotId={blockWirelessPulseSlotId}
              canvasNodeId={canvasNode.id}
              onCommitValue={(next) => onUpdateGroupParameter(parameter.idParameter, next)}
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
              onSlotWirelessHoverStart={onGroupSlotWirelessHoverStart}
              onSlotWirelessHoverEnd={onGroupSlotWirelessHoverEnd}
              onSlotCycleRouting={onGroupSlotCycleRouting}
            />
          )
        })}
      </div>
    </article>
  )
}
