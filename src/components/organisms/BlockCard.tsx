import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'
import { useMemo } from 'react'

import { BlockParameterRow } from '@/components/molecules/BlockParameterRow'
import { BlockSlotConnectionPager } from '@/components/molecules/BlockSlotConnectionPager'
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
  blockHeaderPortStackOffsetY,
  expandBlockHeaderSlotPorts,
  resolveBlockHeaderSlotsForStructure,
} from '@/core/blockCardHeaderSlots'
import { blockTypeDefinitionById } from '@/core/blockStructureRegistry'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockParameterDef } from '@/core/blockSchema'
import type { BlockWirelessNodeDisplay, BlockSlotWirelessLink } from '@/core/blockConnectionDisplay'
import { isBlockSlotPulsing } from '@/core/blockConnectionDisplay'
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import { BlockSlotPeerToolbar } from '@/components/molecules/BlockSlotPeerToolbar'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'
import { findConnectionsForBlockOutputSlot } from '@/core/blockSlotConnections'

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
  resolveBlockOutputSlotConnectionIndex?: (slotId: string, connectionCount: number) => number
  onBlockOutputSlotConnectionIndexChange?: (slotId: string, index: number) => void
  slotToolsEnabled?: boolean
  onSlotToolsEnabledChange?: (enabled: boolean) => void
  blockSlotPeerActions?: BlockSlotPeerActions
  onMapHashStructureSlotRemoved?: (slotId: string) => void
  canvasScale?: number
  structureCardResizeModifierActive?: boolean
  onStructureCardResize?: (payload: { width: number; positionX: number }) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  onAddParameterFromCatalog?: (doc: BlockParameterJsonDocument) => void
  onRemoveParameter?: (paramId: string) => void
  onEditParameter?: (param: BlockParameterDef, screenAnchor?: CanvasContextMenuAnchor) => void
  parameterPanelRequest?: 'add' | 'edit' | 'remove' | null
  parameterPanelScreenAnchor?: CanvasContextMenuAnchor | null
  onParameterPanelRequestHandled?: () => void
  onParameterPanelDismiss?: () => void
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
  resolveBlockOutputSlotConnectionIndex,
  onBlockOutputSlotConnectionIndexChange,
  slotToolsEnabled = false,
  onSlotToolsEnabledChange,
  blockSlotPeerActions,
  onMapHashStructureSlotRemoved,
  canvasScale = 1,
  structureCardResizeModifierActive = false,
  onStructureCardResize,
  onSelect,
  onStartDrag,
  onAddParameterFromCatalog,
  onRemoveParameter,
  onEditParameter,
  parameterPanelRequest = null,
  parameterPanelScreenAnchor = null,
  onParameterPanelRequestHandled,
  onParameterPanelDismiss,
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
  const headerOutputPortsWithPagerBelow = slotToolsEnabled
    ? headerOutputPorts.filter(
        (port) =>
          findConnectionsForBlockOutputSlot(scene, canvasNode.id, port.slotId).length > 1,
      )
    : []

  const headerPortOffsetY = (port: (typeof headerPorts)[number]): number =>
    blockHeaderPortStackOffsetY(headerPorts, port)

  const headerSlotTypeLabel = (port: (typeof headerPorts)[number]): string => {
    if (port.types.length <= 1) {
      return port.types[0] ?? port.direction
    }
    return `${String(port.types.length)} tipos (${port.types.join(', ')})`
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
        if (onStartDrag) {
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
      <header
        className={styles.header}
        data-slot-tools={slotToolsEnabled ? '1' : '0'}
        data-slot-pager-below={headerOutputPortsWithPagerBelow.length > 0 ? '1' : '0'}
      >
        <div className={styles.headerSlotColumn}>
          {headerInputPorts.length > 0 ? (
            headerInputPorts.map((port) => {
              const headerInputLink = blockWirelessDisplay?.slots.get(port.slotId)
              const headerInputPeerState =
                slotToolsEnabled && headerInputLink && blockSlotPeerActions
                  ? blockSlotPeerActions.getPeerState(port.slotId, 'input')
                  : undefined

              return (
              <div
                key={port.slotId}
                className={styles.headerSlotStackItem}
                style={{ transform: `translateY(${String(headerPortOffsetY(port))}px)` }}
              >
                <div className={styles.headerSlotOutStack}>
                  <BlockSlot
                    variant="in"
                    ariaLabel={`Entrada do bloco (${headerSlotTypeLabel(port)})`}
                    disabled={interactionLocked}
                    linked={Boolean(headerInputLink)}
                    wireless={headerInputLink?.routing === 'wireless'}
                    forced={headerInputLink?.forced === true}
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
                      if (headerInputLink) {
                        onBlockSlotWirelessHoverStart?.(port.slotId, headerInputLink)
                      }
                    }}
                    onPointerLeave={onBlockSlotWirelessHoverEnd}
                  />
                  {headerInputPeerState ? (
                    <BlockSlotPeerToolbar
                      peer={headerInputPeerState}
                      onFocusPeer={() => blockSlotPeerActions!.onFocusPeer(port.slotId, 'input')}
                      onRemoveConnection={() =>
                        blockSlotPeerActions!.onRemoveConnection(port.slotId, 'input')
                      }
                      onToggleLock={() => blockSlotPeerActions!.onToggleLock(port.slotId, 'input')}
                      onToggleVisibility={() =>
                        blockSlotPeerActions!.onToggleVisibility(port.slotId, 'input')
                      }
                    />
                  ) : null}
                </div>
              </div>
              )
            })
          ) : (
            <span />
          )}
        </div>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>{structure.blockName}</h3>
        </div>
        <div className={styles.headerSlotColumn}>
          {headerOutputPorts.length > 0 ? (
            headerOutputPorts.map((port) => {
              const outputConnectionCount = findConnectionsForBlockOutputSlot(
                scene,
                canvasNode.id,
                port.slotId,
              ).length
              const outputConnectionIndex =
                resolveBlockOutputSlotConnectionIndex?.(port.slotId, outputConnectionCount) ?? 0
              const headerSlotLink = blockWirelessDisplay?.slots.get(port.slotId)
              const headerPeerState =
                slotToolsEnabled && headerSlotLink && blockSlotPeerActions
                  ? blockSlotPeerActions.getPeerState(
                      port.slotId,
                      'output',
                      outputConnectionIndex,
                    )
                  : undefined

              return (
              <div
                key={port.slotId}
                className={styles.headerSlotStackItem}
                style={{ transform: `translateY(${String(headerPortOffsetY(port))}px)` }}
              >
                <div className={styles.headerSlotOutStack}>
                  {!slotToolsEnabled ? (
                    <BlockSlotConnectionPager
                      onSelectedIndexChange={(index) =>
                        onBlockOutputSlotConnectionIndexChange?.(port.slotId, index)
                      }
                      selectedIndex={outputConnectionIndex}
                      total={outputConnectionCount}
                    />
                  ) : null}
                  <BlockSlot
                    variant="out"
                    ariaLabel={`Saída do bloco (${headerSlotTypeLabel(port)})`}
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
                  {headerPeerState ? (
                    <BlockSlotPeerToolbar
                      peer={headerPeerState}
                      onFocusPeer={() =>
                        blockSlotPeerActions!.onFocusPeer(
                          port.slotId,
                          'output',
                          outputConnectionIndex,
                        )
                      }
                      onRemoveConnection={() =>
                        blockSlotPeerActions!.onRemoveConnection(
                          port.slotId,
                          'output',
                          outputConnectionIndex,
                        )
                      }
                      onToggleLock={() =>
                        blockSlotPeerActions!.onToggleLock(
                          port.slotId,
                          'output',
                          outputConnectionIndex,
                        )
                      }
                      onToggleVisibility={() =>
                        blockSlotPeerActions!.onToggleVisibility(
                          port.slotId,
                          'output',
                          outputConnectionIndex,
                        )
                      }
                    />
                  ) : null}
                </div>
              </div>
              )
            })
          ) : (
            <span />
          )}
        </div>
        {headerOutputPortsWithPagerBelow.length > 0 ? (
          <div className={styles.headerSlotPagerBelow}>
            {headerOutputPortsWithPagerBelow.map((port) => {
              const outputConnectionCount = findConnectionsForBlockOutputSlot(
                scene,
                canvasNode.id,
                port.slotId,
              ).length
              const outputConnectionIndex =
                resolveBlockOutputSlotConnectionIndex?.(port.slotId, outputConnectionCount) ?? 0

              return (
                <BlockSlotConnectionPager
                  key={port.slotId}
                  layout="below"
                  onSelectedIndexChange={(index) =>
                    onBlockOutputSlotConnectionIndexChange?.(port.slotId, index)
                  }
                  selectedIndex={outputConnectionIndex}
                  total={outputConnectionCount}
                />
              )
            })}
          </div>
        ) : null}
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
          const outputConnectionCount = findConnectionsForBlockOutputSlot(
            scene,
            canvasNode.id,
            outputSlotId,
          ).length
          const outputConnectionIndex =
            resolveBlockOutputSlotConnectionIndex?.(outputSlotId, outputConnectionCount) ?? 0

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
              outputConnectionCount={outputConnectionCount}
              outputConnectionIndex={outputConnectionIndex}
              onOutputConnectionIndexChange={(index) =>
                onBlockOutputSlotConnectionIndexChange?.(outputSlotId, index)
              }
              slotToolsEnabled={slotToolsEnabled}
              blockSlotPeerActions={blockSlotPeerActions}
              blockWirelessSlots={blockWirelessDisplay?.slots}
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
              onMapHashOutputPointerDown={(slotId, event) =>
                onBlockOutputPointerDown?.(parameter.idParameter, slotId, event)
              }
              onMapHashOutputPointerUp={(_slotId, event) => {
                onBlockOutputPointerUp?.(parameter.idParameter, _slotId, event)
              }}
              onMapHashOutputPointerMove={(_slotId, event) => {
                onBlockOutputPointerMove?.(parameter.idParameter, _slotId, event)
              }}
              onMapHashStructureSlotRemoved={onMapHashStructureSlotRemoved}
              onSlotWirelessHoverStart={onBlockSlotWirelessHoverStart}
              onSlotWirelessHoverEnd={onBlockSlotWirelessHoverEnd}
            />
          )
        })}
      </div>

      {onAddParameterFromCatalog ||
      onRemoveParameter ||
      onEditParameter ||
      onSlotToolsEnabledChange ? (
        <footer className={styles.footer}>
          <BlockCardParameterMenu
            blockType={structure.blockType}
            parameters={structure.parameters}
            slotToolsEnabled={slotToolsEnabled}
            onSlotToolsEnabledChange={onSlotToolsEnabledChange}
            onAddParameter={onAddParameterFromCatalog}
            onEditParameter={onEditParameter}
            onRemoveParameter={onRemoveParameter}
            externalPanelRequest={parameterPanelRequest}
            externalScreenAnchor={parameterPanelScreenAnchor}
            onExternalPanelRequestHandled={onParameterPanelRequestHandled}
            onPanelDismiss={onParameterPanelDismiss}
          />
        </footer>
      ) : null}
    </article>
  )
}
