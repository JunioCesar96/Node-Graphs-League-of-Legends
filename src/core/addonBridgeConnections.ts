import { getAddonManifest } from '@/blockStructures/addonRegistry'

import {
  classifyAddonOutputToBlockInput,
  classifyBlockOutputToAddonInput,
} from '@/core/crossSlotConnections'
import {
  findAddonSlotEndpoint,
  withoutConnectionsToAddonInputSlot,
} from '@/core/addonSlotConnections'
import {
  findBlockSlotEndpoint,
  isListPointerBlockOutputSlot,
  withoutConnectionsFromBlockOutputSlot,
} from '@/core/blockSlotConnections'
import type { CanvasConnection, CanvasScene } from '@/core/canvasScene'

export type BlockToAddonLinkRequest = {
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
  toNodeId: string
  toAddonSlotId: string
  allowForced?: boolean
}

export function applyBlockOutputToAddonInput(
  scene: CanvasScene,
  request: BlockToAddonLinkRequest,
): CanvasScene | null {
  const { fromNodeId, fromBlockSlotId, fromBlockParameterId, toNodeId, toAddonSlotId, allowForced = false } =
    request

  const fromNode = scene.nodes.find((n) => n.id === fromNodeId)
  const toNode = scene.nodes.find((n) => n.id === toNodeId)
  if (!fromNode?.blockStructure || !toNode?.addonInstance) {
    return null
  }

  const fromBlock = findBlockSlotEndpoint(fromNode, fromBlockSlotId)
  const toManifest = getAddonManifest(toNode.addonInstance.addonId)
  let fromBlockEndpoint = fromBlock
  if (
    fromBlockEndpoint?.kind === 'parameter' &&
    fromBlockEndpoint.types.length === 0 &&
    fromNode.blockStructure
  ) {
    const paramId = fromBlockParameterId ?? fromBlockEndpoint.parameterId
    const param = fromNode.blockStructure.parameters.find((entry) => entry.idParameter === paramId)
    if (param?.typeParameter) {
      fromBlockEndpoint = { ...fromBlockEndpoint, types: [param.typeParameter] }
    }
  }
  const toAddon = toManifest ? findAddonSlotEndpoint(toNode, toManifest, toAddonSlotId) : undefined
  if (!fromBlockEndpoint || !toAddon) {
    return null
  }
  const connectionClass = classifyBlockOutputToAddonInput(fromBlockEndpoint, toAddon)
  if (connectionClass.kind === 'incompatible') {
    return null
  }
  if (connectionClass.kind === 'forced' && !allowForced) {
    return null
  }

  const connectionId = `mix:block->addon:${fromNodeId}:${fromBlockSlotId}->${toNodeId}:${toAddonSlotId}`
  if (scene.connections.some((c) => c.id === connectionId)) {
    return scene
  }

  const connection: CanvasConnection = {
    id: connectionId,
    fromNodeId,
    fromInternalStructureId: `__block__:${fromBlockSlotId}`,
    toNodeId,
    routing: 'flex',
    fromBlockSlotId,
    ...(fromBlockParameterId ? { fromBlockParameterId } : {}),
    toAddonSlotId,
    ...(connectionClass.kind === 'forced' ? { forced: true } : {}),
  }

  const prunedInputs = withoutConnectionsToAddonInputSlot(scene.connections, toNodeId, toAddonSlotId)
  const connections = isListPointerBlockOutputSlot(fromNode, fromBlockSlotId, fromBlockParameterId)
    ? prunedInputs
    : withoutConnectionsFromBlockOutputSlot(prunedInputs, fromNodeId, fromBlockSlotId, fromNode)

  return {
    ...scene,
    connections: [...connections, connection],
  }
}

export type AddonToBlockLinkRequest = {
  fromNodeId: string
  fromAddonSlotId: string
  toNodeId: string
  toBlockSlotId: string
  toBlockParameterId?: string
  allowForced?: boolean
}

export function applyAddonOutputToBlockInput(
  scene: CanvasScene,
  request: AddonToBlockLinkRequest,
): CanvasScene | null {
  const { fromNodeId, fromAddonSlotId, toNodeId, toBlockSlotId, toBlockParameterId, allowForced = false } =
    request

  const fromNode = scene.nodes.find((n) => n.id === fromNodeId)
  const toNode = scene.nodes.find((n) => n.id === toNodeId)
  if (!fromNode?.addonInstance || !toNode?.blockStructure) {
    return null
  }

  const fromManifest = getAddonManifest(fromNode.addonInstance.addonId)
  const fromAddon = fromManifest ? findAddonSlotEndpoint(fromNode, fromManifest, fromAddonSlotId) : undefined
  let toBlockEndpoint = findBlockSlotEndpoint(toNode, toBlockSlotId)
  if (
    toBlockEndpoint?.kind === 'parameter' &&
    toBlockEndpoint.types.length === 0 &&
    toNode.blockStructure
  ) {
    const paramId = toBlockParameterId ?? toBlockEndpoint.parameterId
    const param = toNode.blockStructure.parameters.find((entry) => entry.idParameter === paramId)
    if (param?.typeParameter) {
      toBlockEndpoint = { ...toBlockEndpoint, types: [param.typeParameter] }
    }
  }
  if (!fromAddon || !toBlockEndpoint) {
    return null
  }
  const connectionClass = classifyAddonOutputToBlockInput(fromAddon, toBlockEndpoint)
  if (connectionClass.kind === 'incompatible') {
    return null
  }
  if (connectionClass.kind === 'forced' && !allowForced) {
    return null
  }

  const connectionId = `mix:addon->block:${fromNodeId}:${fromAddonSlotId}->${toNodeId}:${toBlockSlotId}`
  if (scene.connections.some((c) => c.id === connectionId)) {
    return scene
  }

  const resolvedParamId = toBlockParameterId ?? toBlockEndpoint.parameterId

  const connection: CanvasConnection = {
    id: connectionId,
    fromNodeId,
    fromInternalStructureId: `__addon__:${fromAddonSlotId}`,
    toNodeId,
    routing: 'flex',
    fromAddonSlotId,
    toBlockSlotId,
    ...(resolvedParamId ? { toBlockParameterId: resolvedParamId } : {}),
    ...(connectionClass.kind === 'forced' ? { forced: true } : {}),
  }

  const connections = scene.connections.filter(
    (c) =>
      !(
        c.toNodeId === toNodeId &&
        c.toBlockSlotId === toBlockSlotId &&
        (c.toBlockParameterId === resolvedParamId ||
          (!c.toBlockParameterId && !resolvedParamId))
      ),
  )

  return {
    ...scene,
    connections: [...connections, connection],
  }
}
