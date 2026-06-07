import { memo } from 'react'

import { AddonCardHost } from '@/components/molecules/AddonCardHost'
import { BlockCard } from '@/components/organisms/BlockCard'
import { GroupCard } from '@/components/organisms/GroupCard'
import { NodeCard } from '@/components/organisms/NodeCard'
import {
  useGraphCanvasNodeHost,
  useGraphCanvasScene,
  type BlockWirelessNodeDisplay,
  type NodeCardBodyLayout,
  type WirelessPortPulseTarget,
} from '@/components/organisms/GraphCanvasNodeHostContext'
import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'
import {
  canvasNodeBodyStyle,
  canvasNodeCardStyle,
  canvasNodeInputPortStyle,
  getNodeDisplayTitle,
} from '@/core/canvasNodePresentation'
import type { WirelessNodeDisplay } from '@/core/connectionDisplay'
import { graphClientToPosition } from '@/core/canvasCoordinates'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import { schemaRegistry } from '@/core/nodeStructureRegistry'

import styles from './GraphCanvas.module.css'

export type GraphCanvasSceneNodeProps = {
  canvasNode: CanvasNode
  renderPosition: CanvasPosition
  isSelected: boolean
  nodeInteractionLocked: boolean
  nodeLocked: boolean
  isCompatibleTarget: boolean
  isIncompatibleDuringLink: boolean
  wirelessHighlighted: boolean
  linkDropHovered: boolean
  cardHandlesSelection: boolean
  blockWirelessDisplay?: BlockWirelessNodeDisplay
  groupWirelessDisplay?: BlockWirelessNodeDisplay
  wirelessDisplay?: WirelessNodeDisplay
  blockWirelessPulseSlotId?: string
  groupWirelessPulseSlotId?: string
  wirelessPortPulse?: WirelessPortPulseTarget
  slotToolsEnabled: boolean
  slotPagerEnabled: boolean
  parameterPanelRequest: 'add' | 'edit' | 'remove' | null
  parameterPanelScreenAnchor: CanvasContextMenuAnchor | null
  blockSlotPeerActions?: BlockSlotPeerActions
  activeBlockSlotId?: string
  activeGroupSlotId?: string
  activeAddonSlotId?: string
  activeOutputInternalStructureId?: string
  bodyCollapsed: boolean
  cardBodyLayout: NodeCardBodyLayout
  neekoTransforming: boolean
  ritualDropHover: boolean
}

function areGraphCanvasSceneNodePropsEqual(
  prev: GraphCanvasSceneNodeProps,
  next: GraphCanvasSceneNodeProps,
): boolean {
  if (prev.canvasNode !== next.canvasNode) {
    return false
  }

  if (
    prev.renderPosition.x !== next.renderPosition.x ||
    prev.renderPosition.y !== next.renderPosition.y
  ) {
    return false
  }

  if (prev.isSelected !== next.isSelected) {
    return false
  }

  if (prev.nodeInteractionLocked !== next.nodeInteractionLocked) {
    return false
  }

  if (prev.nodeLocked !== next.nodeLocked) {
    return false
  }

  if (prev.isCompatibleTarget !== next.isCompatibleTarget) {
    return false
  }

  if (prev.isIncompatibleDuringLink !== next.isIncompatibleDuringLink) {
    return false
  }

  if (prev.wirelessHighlighted !== next.wirelessHighlighted) {
    return false
  }

  if (prev.linkDropHovered !== next.linkDropHovered) {
    return false
  }

  if (prev.cardHandlesSelection !== next.cardHandlesSelection) {
    return false
  }

  if (prev.blockWirelessDisplay !== next.blockWirelessDisplay) {
    return false
  }

  if (prev.groupWirelessDisplay !== next.groupWirelessDisplay) {
    return false
  }

  if (prev.wirelessDisplay !== next.wirelessDisplay) {
    return false
  }

  if (prev.blockWirelessPulseSlotId !== next.blockWirelessPulseSlotId) {
    return false
  }

  if (prev.groupWirelessPulseSlotId !== next.groupWirelessPulseSlotId) {
    return false
  }

  if (prev.wirelessPortPulse !== next.wirelessPortPulse) {
    return false
  }

  if (prev.slotToolsEnabled !== next.slotToolsEnabled) {
    return false
  }

  if (prev.slotPagerEnabled !== next.slotPagerEnabled) {
    return false
  }

  if (prev.parameterPanelRequest !== next.parameterPanelRequest) {
    return false
  }

  if (prev.parameterPanelScreenAnchor !== next.parameterPanelScreenAnchor) {
    return false
  }

  if (prev.activeBlockSlotId !== next.activeBlockSlotId) {
    return false
  }

  if (prev.activeGroupSlotId !== next.activeGroupSlotId) {
    return false
  }

  if (prev.activeAddonSlotId !== next.activeAddonSlotId) {
    return false
  }

  if (prev.activeOutputInternalStructureId !== next.activeOutputInternalStructureId) {
    return false
  }

  if (prev.bodyCollapsed !== next.bodyCollapsed) {
    return false
  }

  if (prev.cardBodyLayout !== next.cardBodyLayout) {
    return false
  }

  if (prev.neekoTransforming !== next.neekoTransforming) {
    return false
  }

  if (prev.ritualDropHover !== next.ritualDropHover) {
    return false
  }

  return true
}

function GraphCanvasSceneNodeInner(props: GraphCanvasSceneNodeProps) {
  const {
    canvasNode,
    renderPosition,
    isSelected,
    nodeInteractionLocked,
    nodeLocked,
    isCompatibleTarget,
    isIncompatibleDuringLink,
    wirelessHighlighted,
    linkDropHovered,
    cardHandlesSelection,
    blockWirelessDisplay,
    groupWirelessDisplay,
    wirelessDisplay,
    blockWirelessPulseSlotId,
    groupWirelessPulseSlotId,
    wirelessPortPulse,
    slotToolsEnabled,
    slotPagerEnabled,
    parameterPanelRequest,
    parameterPanelScreenAnchor,
    blockSlotPeerActions,
    activeBlockSlotId,
    activeGroupSlotId,
    activeAddonSlotId,
    activeOutputInternalStructureId,
    bodyCollapsed,
    cardBodyLayout,
    neekoTransforming,
    ritualDropHover,
  } = props

  const host = useGraphCanvasNodeHost()
  const scene = useGraphCanvasScene()

  const classes = [
    styles.node,
    isSelected && !cardHandlesSelection ? styles.nodeSelected : '',
    wirelessHighlighted && !canvasNode.blockViewActive ? styles.nodeWirelessLinked : '',
    isCompatibleTarget ? styles.nodeCompatibleTarget : '',
    isIncompatibleDuringLink ? styles.nodeIncompatibleTarget : '',
    linkDropHovered ? styles.nodeLinkDropTarget : '',
  ]
    .filter(Boolean)
    .join(' ')

  const catalogParameters = (() => {
    const sid = canvasNode.node.schema.id
    const kind = host.schemaNodeKindBySchemaId?.[sid] ?? 'module'
    if (kind !== 'base') {
      return undefined
    }
    const list = host.schemaBaseParameterCatalogBySchemaId?.[sid] ?? []
    const ids = new Set(canvasNode.node.schema.parameters.map((p) => p.id))
    const names = new Set(canvasNode.node.schema.parameters.map((p) => p.name))
    return list.filter((p) => !ids.has(p.id) && !names.has(p.name))
  })()

  const outputSlotPeerActions = host.buildOutputSlotPeerActions(canvasNode.id)

  return (
    <div
      className={classes}
      data-canvas-node="true"
      data-canvas-node-id={canvasNode.id}
      onContextMenu={host.handleContextMenu}
      style={{
        left: `${renderPosition.x}px`,
        top: `${renderPosition.y}px`,
      }}
    >
      {canvasNode.addonViewActive && canvasNode.addonInstance ? (
        <AddonCardHost
          canvasNode={canvasNode}
          scene={scene}
          selected={isSelected}
          interactionLocked={nodeInteractionLocked}
          activeAddonSlotId={activeAddonSlotId}
          onGraphStateMutation={(nodeId, outputs) => host.onApplyAddonOutputs?.(nodeId, outputs)}
          onAddonOutputPointerDown={(slotId, event) => {
            if (event.button !== 0) {
              return
            }
            event.stopPropagation()
            host.addonLinks.beginAddonOutputLink(canvasNode.id, slotId)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onAddonOutputPointerUp={(_slotId, event) => {
            event.stopPropagation()
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onAddonOutputPointerCancel={(_slotId, event) => {
            event.stopPropagation()
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            host.addonLinks.endAddonLinkDraft()
          }}
          onAddonOutputPointerMove={(_slotId, event) => {
            host.addonLinks.setAddonLinkDraftPointFromClient(event.clientX, event.clientY)
          }}
          onAddonInputPointerUp={(slotId, event) => {
            const pendingAddon = host.addonLinks.getPendingAddonLink()
            if (pendingAddon && host.onConnectAddonSlots) {
              host.tryConnectCrossSlots({
                kind: 'addon',
                fromNodeId: pendingAddon.fromNodeId,
                fromAddonSlotId: pendingAddon.fromAddonSlotId,
                toNodeId: canvasNode.id,
                toAddonSlotId: slotId,
              })
              host.addonLinks.endAddonLinkDraft()
              host.onSelectNode(canvasNode.id)
              return
            }
            const pendingBlock = host.pendingBlockLinkRef.current
            if (pendingBlock && host.onConnectAddonSlots) {
              host.tryConnectCrossSlots({
                kind: 'blockToAddon',
                fromNodeId: pendingBlock.fromNodeId,
                fromBlockSlotId: pendingBlock.fromBlockSlotId,
                fromBlockParameterId: pendingBlock.fromBlockParameterId,
                toNodeId: canvasNode.id,
                toAddonSlotId: slotId,
              })
              host.endBlockLinkDraft()
              host.onSelectNode(canvasNode.id)
              return
            }
            host.addonLinks.resolveAddonLinkDrop(event.clientX, event.clientY)
          }}
          onSelect={(event) =>
            host.onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })
          }
          onStartDrag={
            nodeInteractionLocked
              ? undefined
              : (event) => host.startNodeDrag(event, canvasNode)
          }
        />
      ) : canvasNode.groupViewActive && canvasNode.groupStructure ? (
        <GroupCard
          canvasNode={canvasNode}
          scene={scene}
          selected={isSelected}
          interactionLocked={nodeInteractionLocked}
          activeGroupSlotId={activeGroupSlotId}
          blockWirelessDisplay={groupWirelessDisplay}
          blockWirelessPulseSlotId={groupWirelessPulseSlotId}
          onUpdateGroupParameter={(paramId, value) =>
            host.onUpdateGroupParameter?.(canvasNode.id, paramId, value)
          }
          onBlockOutputPointerDown={(paramId, slotId, event) => {
            event.stopPropagation()
            host.beginGroupOutputLink(canvasNode.id, slotId, paramId)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onBlockOutputPointerUp={(_paramId, _slotId, event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            host.resolveGroupLinkDrop(event.clientX, event.clientY)
          }}
          onBlockOutputPointerMove={(_paramId, _slotId, event) => {
            const canvasEl = host.canvasRef.current
            if (!canvasEl) {
              return
            }
            host.setGroupLinkDraftPoint(
              graphClientToPosition(canvasEl, host.scale, event.clientX, event.clientY),
            )
          }}
          onBlockHeaderOutputPointerDown={(slotId, event) => {
            event.stopPropagation()
            host.beginGroupOutputLink(canvasNode.id, slotId)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onBlockHeaderOutputPointerUp={(_slotId, event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            host.resolveGroupLinkDrop(event.clientX, event.clientY)
          }}
          onBlockHeaderInputPointerUp={(_slotId, event) => {
            host.resolveGroupLinkDrop(event.clientX, event.clientY)
          }}
          onBlockInputPointerUp={(_paramId, _slotId, event) => {
            host.resolveGroupLinkDrop(event.clientX, event.clientY)
          }}
          onGroupSlotWirelessHoverStart={host.handleGroupSlotWirelessHoverStart}
          onGroupSlotWirelessHoverEnd={host.handleGroupSlotWirelessHoverEnd}
          onGroupSlotCycleRouting={host.onCycleConnectionRouting}
          canvasScale={host.scale}
          structureCardResizeModifierActive={
            host.structureCardResizeModifierActive && !host.glueModeActive
          }
          onStructureCardResize={({ width, positionX }) =>
            host.onSetStructureCardWidth?.(canvasNode.id, width, positionX)
          }
          onSelect={(event) =>
            host.onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })
          }
          onStartDrag={
            nodeInteractionLocked
              ? undefined
              : (event) => host.startNodeDrag(event, canvasNode)
          }
        />
      ) : canvasNode.blockViewActive && canvasNode.blockStructure ? (
        <BlockCard
          canvasNode={canvasNode}
          scene={scene}
          selected={isSelected}
          interactionLocked={nodeInteractionLocked}
          activeBlockSlotId={activeBlockSlotId}
          blockWirelessDisplay={blockWirelessDisplay}
          blockWirelessPulseSlotId={blockWirelessPulseSlotId}
          onUpdateBlockParameter={(paramId, value) =>
            host.onUpdateBlockParameter?.(canvasNode.id, paramId, value)
          }
          onBlockOutputPointerDown={(paramId, slotId, event) => {
            event.stopPropagation()
            host.beginBlockOutputLink(canvasNode.id, slotId, paramId)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onBlockOutputPointerUp={(_paramId, _slotId, event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            host.resolveBlockLinkDrop(event.clientX, event.clientY)
          }}
          onBlockOutputPointerMove={(_paramId, _slotId, event) => {
            const canvasEl = host.canvasRef.current
            if (!canvasEl) {
              return
            }
            host.setBlockLinkDraftPoint(
              graphClientToPosition(canvasEl, host.scale, event.clientX, event.clientY),
            )
          }}
          onBlockHeaderOutputPointerDown={(slotId, event) => {
            event.stopPropagation()
            host.beginBlockOutputLink(canvasNode.id, slotId)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onBlockHeaderOutputPointerUp={(_slotId, event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            host.resolveBlockLinkDrop(event.clientX, event.clientY)
          }}
          onBlockHeaderInputPointerUp={(slotId, event) => {
            const pendingAddon = host.addonLinks.getPendingAddonLink()
            if (pendingAddon && host.onConnectAddonSlots) {
              host.tryConnectCrossSlots({
                kind: 'addonToBlock',
                fromNodeId: pendingAddon.fromNodeId,
                fromAddonSlotId: pendingAddon.fromAddonSlotId,
                toNodeId: canvasNode.id,
                toBlockSlotId: slotId,
              })
              host.addonLinks.endAddonLinkDraft()
              host.onSelectNode(canvasNode.id)
              return
            }
            host.resolveBlockLinkDrop(event.clientX, event.clientY)
          }}
          onBlockInputPointerUp={(paramId, slotId, event) => {
            const pendingAddon = host.addonLinks.getPendingAddonLink()
            if (pendingAddon && host.onConnectAddonSlots) {
              host.tryConnectCrossSlots({
                kind: 'addonToBlock',
                fromNodeId: pendingAddon.fromNodeId,
                fromAddonSlotId: pendingAddon.fromAddonSlotId,
                toNodeId: canvasNode.id,
                toBlockSlotId: slotId,
                toBlockParameterId: paramId,
              })
              host.addonLinks.endAddonLinkDraft()
              host.onSelectNode(canvasNode.id)
              return
            }
            host.resolveBlockLinkDrop(event.clientX, event.clientY)
          }}
          onBlockSlotWirelessHoverStart={host.handleBlockSlotWirelessHoverStart}
          onBlockSlotWirelessHoverEnd={host.handleBlockSlotWirelessHoverEnd}
          resolveBlockOutputSlotConnectionIndex={(slotId, connectionCount) =>
            host.resolveBlockOutputSlotConnectionIndexForNode(
              canvasNode.id,
              slotId,
              connectionCount,
            )
          }
          onBlockOutputSlotConnectionIndexChange={(slotId, index) =>
            host.handleBlockOutputSlotConnectionIndexChange(canvasNode.id, slotId, index)
          }
          slotToolsEnabled={slotToolsEnabled}
          lightModeEnabled={host.nodeLightModeEnabled}
          blockElementView={canvasNode.blockElementView}
          onBlockElementSelectedIndexChange={
            host.onSetBlockElementSelectedIndex
              ? (elementKey, index) =>
                  host.onSetBlockElementSelectedIndex?.(canvasNode.id, elementKey, index)
              : undefined
          }
          slotPagerEnabled={slotPagerEnabled}
          onSlotToolsEnabledChange={(enabled) => {
            host.setBlockSlotToolsEnabled(canvasNode.id, enabled)
          }}
          blockSlotPeerActions={
            blockSlotPeerActions ??
            (slotToolsEnabled ? host.buildBlockSlotPeerActions(canvasNode.id) : undefined)
          }
          onMapHashStructureSlotRemoved={
            host.onRemoveConnectionsFromBlockSlot
              ? (slotId) => host.onRemoveConnectionsFromBlockSlot?.(canvasNode.id, slotId)
              : undefined
          }
          canvasScale={host.scale}
          structureCardResizeModifierActive={
            host.structureCardResizeModifierActive && !host.glueModeActive
          }
          onStructureCardResize={({ width, positionX }) =>
            host.onSetStructureCardWidth?.(canvasNode.id, width, positionX)
          }
          onSelect={(event) =>
            host.onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })
          }
          onStartDrag={
            nodeInteractionLocked
              ? undefined
              : (event) => host.startNodeDrag(event, canvasNode)
          }
          onAddParameterFromCatalog={
            nodeInteractionLocked || !host.onAddBlockParameterFromCatalog
              ? undefined
              : (doc) => {
                  const result = host.onAddBlockParameterFromCatalog?.(canvasNode.id, doc)
                  if (result && !result.ok) {
                    host.showBlockParameterCatalogError(result.error)
                  }
                }
          }
          onRemoveParameter={
            nodeInteractionLocked || !host.onRemoveBlockParameter
              ? undefined
              : (paramId) => host.onRemoveBlockParameter?.(canvasNode.id, paramId)
          }
          onEditParameter={
            nodeInteractionLocked || !host.onEditBlockParameter
              ? undefined
              : (param, screenAnchor) => {
                  const anchor = screenAnchor ?? host.blockParameterScreenAnchor ?? undefined
                  host.onEditBlockParameter?.(canvasNode.id, param, anchor)
                  host.clearBlockParameterPanelState()
                }
          }
          parameterPanelRequest={parameterPanelRequest}
          parameterPanelScreenAnchor={parameterPanelScreenAnchor}
          onParameterPanelDismiss={host.dismissBlockParameterPanel}
          onParameterPanelRequestHandled={host.clearBlockParameterPanelRequest}
          wirelessHighlighted={wirelessHighlighted}
        />
      ) : (
        <NodeCard
          activeOutputInternalStructureId={activeOutputInternalStructureId}
          bodyStyle={canvasNodeBodyStyle(canvasNode)}
          cardStyle={canvasNodeCardStyle(canvasNode)}
          inputPortStyle={canvasNodeInputPortStyle(canvasNode)}
          canvasNodeId={canvasNode.id}
          canAcceptLink={isCompatibleTarget}
          connections={scene.connections}
          displayTitle={getNodeDisplayTitle(canvasNode)}
          locked={nodeLocked}
          onLockedInteraction={host.onNodeLockedInteraction}
          catalogParameters={catalogParameters}
          node={canvasNode.node}
          nodeKind={host.schemaNodeKindBySchemaId?.[canvasNode.node.schema.id] ?? 'module'}
          templateSchema={schemaRegistry[canvasNode.node.schema.id] ?? null}
          parameterStubCatalog={
            host.schemaBaseParameterCatalogBySchemaId?.[canvasNode.node.schema.id] ?? []
          }
          onAppendCatalogParameter={
            host.onCatalogParameterAppend
              ? (definition) => host.onCatalogParameterAppend?.(canvasNode.id, definition)
              : undefined
          }
          onAppendEmbedCatalogItem={
            host.onAppendEmbedCatalogItem
              ? (embedId, structure) =>
                  host.onAppendEmbedCatalogItem?.(canvasNode.id, embedId, structure)
              : undefined
          }
          onAppendPointerCatalogItem={
            host.onAppendPointerCatalogItem
              ? (pointerId, structure) =>
                  host.onAppendPointerCatalogItem?.(canvasNode.id, pointerId, structure)
              : undefined
          }
          onAppendListEmbedCatalogItem={
            host.onAppendListEmbedCatalogItem
              ? (listEmbedId, structure) =>
                  host.onAppendListEmbedCatalogItem?.(canvasNode.id, listEmbedId, structure)
              : undefined
          }
          onAppendListPointerCatalogItem={
            host.onAppendListPointerCatalogItem
              ? (listPointerId, structure) =>
                  host.onAppendListPointerCatalogItem?.(canvasNode.id, listPointerId, structure)
              : undefined
          }
          onAppendList2EmbedCatalogItem={
            host.onAppendList2EmbedCatalogItem
              ? (list2EmbedId, structure) =>
                  host.onAppendList2EmbedCatalogItem?.(canvasNode.id, list2EmbedId, structure)
              : undefined
          }
          onAppendList2PointerCatalogItem={
            host.onAppendList2PointerCatalogItem
              ? (list2PointerId, structure) =>
                  host.onAppendList2PointerCatalogItem?.(canvasNode.id, list2PointerId, structure)
              : undefined
          }
          onRemoveList2EmbedInstance={
            host.onRemoveList2EmbedInstance
              ? (list2EmbedId, instanceId) =>
                  host.onRemoveList2EmbedInstance?.(canvasNode.id, list2EmbedId, instanceId)
              : undefined
          }
          onRemoveList2PointerInstance={
            host.onRemoveList2PointerInstance
              ? (list2PointerId, instanceId) =>
                  host.onRemoveList2PointerInstance?.(canvasNode.id, list2PointerId, instanceId)
              : undefined
          }
          onRequestRemoveElement={
            host.onRequestRemoveElement
              ? (item) => host.onRequestRemoveElement?.(canvasNode.id, item)
              : undefined
          }
          onInputPortClick={() => host.completeLink(canvasNode)}
          onOutputWireKeyboard={(entity) => host.handleOutputWireKeyboard(canvasNode.id, entity)}
          onOutputWirePointerCancel={host.handleOutputWirePointerCancel}
          onOutputWirePointerDown={
            nodeLocked
              ? undefined
              : (entity, event) => host.handleOutputWirePointerDown(canvasNode.id, entity, event)
          }
          onOutputWirePointerMove={host.handleOutputWirePointerMove}
          onOutputWirePointerUp={(entity, event) =>
            host.handleOutputWirePointerUp(canvasNode.id, entity, event)
          }
          onSelect={(event) =>
            host.onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })
          }
          onStartDrag={
            nodeInteractionLocked
              ? undefined
              : (event) => host.startNodeDrag(event, canvasNode)
          }
          onReorderNodeParameter={
            host.onSetNodeParameterOrder
              ? (parameterId, oneBased) =>
                  host.onSetNodeParameterOrder?.(canvasNode.id, parameterId, oneBased)
              : undefined
          }
          onUpdateParameter={
            host.onUpdateNodeParameter
              ? (parameterId, nextValue) =>
                  host.onUpdateNodeParameter?.(canvasNode.id, parameterId, nextValue)
              : undefined
          }
          onSetElementViewMode={
            host.onSetElementViewMode
              ? (elementKey, mode) => host.onSetElementViewMode?.(canvasNode.id, elementKey, mode)
              : undefined
          }
          onSetElementRetracted={
            host.onSetElementRetracted
              ? (elementKey, retracted) =>
                  host.onSetElementRetracted?.(canvasNode.id, elementKey, retracted)
              : undefined
          }
          onSetElementSelectedIndex={
            host.onSetElementSelectedIndex
              ? (elementKey, index) =>
                  host.onSetElementSelectedIndex?.(canvasNode.id, elementKey, index)
              : undefined
          }
          onMapHashStructureSlotRemoved={
            host.onRemoveConnectionsFromOutputSlot
              ? (slotId) => host.onRemoveConnectionsFromOutputSlot?.(canvasNode.id, slotId)
              : undefined
          }
          onCycleConnectionRouting={host.onCycleConnectionRouting}
          onRemoveConnection={host.onRemoveConnection}
          onWirelessPeerHoverStart={host.handleWirelessPeerHoverStart}
          onWirelessPeerHoverEnd={host.handleWirelessPeerHoverEnd}
          wirelessDisplay={wirelessDisplay}
          wirelessPortPulse={wirelessPortPulse}
          parameterHints={host.hints}
          bodyCollapsed={bodyCollapsed}
          cardSectionExpanded={canvasNode.cardSectionExpanded}
          cardSectionOrder={canvasNode.cardSectionOrder}
          cardBodyLayout={cardBodyLayout}
          onToggleCardSection={
            host.onToggleNodeCardSection
              ? (sectionId) => host.onToggleNodeCardSection?.(canvasNode.id, sectionId)
              : undefined
          }
          onReorderNodeCardSection={
            host.onSetNodeCardSectionOrder
              ? (sectionId, oneBased) =>
                  host.onSetNodeCardSectionOrder?.(canvasNode.id, sectionId, oneBased)
              : undefined
          }
          selected={isSelected}
          neekoTransformPhase={canvasNode.neekoTransformPhase}
          neekoTransformError={canvasNode.neekoTransformError}
          isNeekoTransforming={neekoTransforming}
          ritualDropHover={ritualDropHover}
          onNeekoDropCode={
            host.onNeekoDropCode && !nodeLocked
              ? (text) => host.onNeekoDropCode?.(canvasNode.id, text)
              : undefined
          }
          outputSlotPeerActions={outputSlotPeerActions}
        />
      )}
    </div>
  )
}

export const GraphCanvasSceneNode = memo(GraphCanvasSceneNodeInner, areGraphCanvasSceneNodePropsEqual)

GraphCanvasSceneNode.displayName = 'GraphCanvasSceneNode'
