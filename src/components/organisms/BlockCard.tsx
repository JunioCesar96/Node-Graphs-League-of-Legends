import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'
import { useMemo } from 'react'

import { BlockParameterRow } from '@/components/molecules/BlockParameterRow'
import { StructureCardResizeHandles } from '@/components/molecules/StructureCardResizeHandles'
import { BlockSlot } from '@/components/atoms/BlockSlot'
import { BlockTypeDivider } from '@/components/atoms/BlockTypeDivider'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  BLOCK_CARD_WIDTH,
  blockParameterSlotId,
  isBlockStructuralSourcePath,
} from '@/core/blockSchema'
import {
  STRUCTURE_CARD_MAX_WIDTH,
  isStructureCardDragTarget,
  resolveBlockCardWidth,
} from '@/core/structureCardLayout'
import { BlockCardParameterMenu } from '@/components/molecules/BlockCardParameterMenu'
import {
  blockHeaderSlotOffsetY,
  expandBlockHeaderSlotPorts,
  parseBlockHeaderSlotDescriptor,
  resolveBlockHeaderSlotsForStructure,
} from '@/core/blockCardHeaderSlots'
import { blockTypeDefinitionById } from '@/core/blockStructureRegistry'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockParameterDef } from '@/core/blockSchema'
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
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  onAddParameterFromCatalog?: (doc: BlockParameterJsonDocument) => void
  onRemoveParameter?: (paramId: string) => void
  onEditParameter?: (param: BlockParameterDef) => void
  wirelessHighlighted?: boolean
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
  onSelect,
  onStartDrag,
  onAddParameterFromCatalog,
  onRemoveParameter,
  onEditParameter,
  wirelessHighlighted = false,
}: BlockCardProps) {
  const structure = canvasNode.blockStructure
  const cardWidth = resolveBlockCardWidth(canvasNode)
  const typeDef = useMemo(() => {
    if (!structure) {
      return undefined
    }
    const registered = blockTypeDefinitionById(structure.blockType)
    if (registered) {
      return registered
    }
    if (structure.appearance) {
      return {
        id: structure.blockType,
        title: structure.blockType,
        color: structure.appearance.color,
        headerSlots: structure.appearance.headerSlots,
      }
    }
    return undefined
  }, [structure])

  const headerSlots = useMemo(() => {
    if (!structure) {
      return typeDef?.headerSlots ?? []
    }
    return resolveBlockHeaderSlotsForStructure(structure)
  }, [structure, typeDef?.headerSlots])

  const headerPorts = useMemo(() => {
    if (!structure) {
      return []
    }
    return expandBlockHeaderSlotPorts(structure.blockType, headerSlots)
  }, [headerSlots, structure])

  if (!structure) {
    return null
  }
  const headerInputPorts = headerPorts.filter((port) => port.direction === 'input')
  const headerOutputPorts = headerPorts.filter((port) => port.direction === 'output')

  const headerPortOffsetY = (port: (typeof headerPorts)[number]): number => {
    const parsed = parseBlockHeaderSlotDescriptor(headerSlots[port.slotIndex] ?? '')
    const typeCount = parsed?.types.length ?? 1
    if (typeCount <= 1) {
      return 0
    }
    const fieldIndex = port.fieldKey
      ? parsed!.types.findIndex((type) => type === port.fieldKey)
      : 0
    return blockHeaderSlotOffsetY(typeCount, fieldIndex >= 0 ? fieldIndex : 0)
  }

  return (
    <article
      className={[
        styles.card,
        selected ? styles.selected : '',
        wirelessHighlighted ? styles.wirelessHighlighted : '',
        interactionLocked ? styles.locked : '',
        onStartDrag && !interactionLocked ? styles.draggable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-block-card="1"
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
        minWidth={BLOCK_CARD_WIDTH}
        resizeModifierActive={structureCardResizeModifierActive}
        scale={canvasScale}
        startPositionX={canvasNode.position.x}
        width={cardWidth}
        onResize={(payload) => onStructureCardResize?.(payload)}
      />
      <header className={styles.header}>
        <div className={styles.headerSlotColumn}>
          {headerInputPorts.length > 0 ? (
            headerInputPorts.map((port) => (
              <div
                key={port.slotId}
                className={styles.headerSlotStackItem}
                style={{ transform: `translateY(${String(headerPortOffsetY(port))}px)` }}
              >
                <BlockSlot
                  variant="in"
                  ariaLabel={`Entrada do bloco (${port.fieldKey ?? port.types[0] ?? 'in'})`}
                  disabled={interactionLocked}
                  linked={Boolean(blockWirelessDisplay?.slots.get(port.slotId))}
                  wireless={blockWirelessDisplay?.slots.get(port.slotId)?.routing === 'wireless'}
                  forced={blockWirelessDisplay?.slots.get(port.slotId)?.forced === true}
                  pulsing={isBlockSlotPulsing(
                    blockWirelessPulseSlotId
                      ? { nodeId: canvasNode.id, slotId: blockWirelessPulseSlotId }
                      : null,
                    canvasNode.id,
                    port.slotId,
                  )}
                  slotId={port.slotId}
                  nodeId={canvasNode.id}
                  onPointerUp={(event) => onBlockHeaderInputPointerUp?.(port.slotId, event)}
                  onPointerEnter={() => {
                    const link = blockWirelessDisplay?.slots.get(port.slotId)
                    if (link) {
                      onBlockSlotWirelessHoverStart?.(port.slotId, link)
                    }
                  }}
                  onPointerLeave={onBlockSlotWirelessHoverEnd}
                />
              </div>
            ))
          ) : (
            <span />
          )}
        </div>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>{structure.blockName}</h3>
        </div>
        <div className={styles.headerSlotColumn}>
          {headerOutputPorts.length > 0 ? (
            headerOutputPorts.map((port) => (
              <div
                key={port.slotId}
                className={styles.headerSlotStackItem}
                style={{ transform: `translateY(${String(headerPortOffsetY(port))}px)` }}
              >
                <BlockSlot
                  variant="out"
                  ariaLabel={`Saída do bloco (${port.fieldKey ?? port.types[0] ?? 'out'})`}
                  disabled={interactionLocked}
                  active={activeBlockSlotId === port.slotId}
                  linked={Boolean(blockWirelessDisplay?.slots.get(port.slotId))}
                  wireless={blockWirelessDisplay?.slots.get(port.slotId)?.routing === 'wireless'}
                  forced={blockWirelessDisplay?.slots.get(port.slotId)?.forced === true}
                  pulsing={isBlockSlotPulsing(
                    blockWirelessPulseSlotId
                      ? { nodeId: canvasNode.id, slotId: blockWirelessPulseSlotId }
                      : null,
                    canvasNode.id,
                    port.slotId,
                  )}
                  slotId={port.slotId}
                  nodeId={canvasNode.id}
                  onPointerDown={(event) =>
                    onBlockHeaderOutputPointerDown?.(port.slotId, event)
                  }
                  onPointerUp={(event) => onBlockHeaderOutputPointerUp?.(port.slotId, event)}
                  onPointerEnter={() => {
                    const link = blockWirelessDisplay?.slots.get(port.slotId)
                    if (link) {
                      onBlockSlotWirelessHoverStart?.(port.slotId, link)
                    }
                  }}
                  onPointerLeave={onBlockSlotWirelessHoverEnd}
                />
              </div>
            ))
          ) : (
            <span />
          )}
        </div>
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
              hideValueInput={isBlockStructuralSourcePath(parameter.sourcePath)}
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

      {onAddParameterFromCatalog || onRemoveParameter || onEditParameter ? (
        <footer className={styles.footer}>
          <BlockCardParameterMenu
            blockType={structure.blockType}
            parameters={structure.parameters}
            onAddParameter={onAddParameterFromCatalog}
            onEditParameter={onEditParameter}
            onRemoveParameter={onRemoveParameter}
          />
        </footer>
      ) : null}
    </article>
  )
}
