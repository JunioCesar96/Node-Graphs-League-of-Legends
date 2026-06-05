import { getAddonManifest } from '@/blockStructures/addonRegistry'
import type { AddonManifest, AddonSlot } from '@/services/addonLoader.service'

import { buildSlotWirePathD, resolveBlockSlotCanvasPoint } from '@/core/blockSlotConnections'
import { resolveBlockCardWidth } from '@/core/structureCardLayout'
import { addonSlotAnchorKey, type GraphPanPoint } from '@/core/graphPortAnchors'

import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene } from './canvasScene'
import {
  STRUCTURE_CARD_DIVIDER_HEIGHT,
  STRUCTURE_CARD_HEADER_HEIGHT,
} from './structureCardLayout'

export const ADDON_CARD_WIDTH = 280
export const ADDON_SLOT_HIT_RADIUS = 14
export const ADDON_SLOT_EDGE_INSET = 10
export const ADDON_CARD_BODY_MIN_HEIGHT = 120

export type AddonSlotEndpoint = {
  nodeId: string
  slotId: string
  slotName: string
  direction: 'input' | 'output'
  type: string
}

export type AddonSlotHit = {
  nodeId: string
  slotId: string
  slotName: string
  direction: 'input' | 'output'
}

export type AddonSlotLinkRequest = {
  fromNodeId: string
  fromAddonSlotId: string
  toNodeId: string
  toAddonSlotId: string
  allowForced?: boolean
}

export type AddonConnectionPath = {
  id: string
  d: string
  routing?: CanvasConnection['routing']
  forced?: boolean
}

export function addonSlotId(slotName: string, direction: 'input' | 'output'): string {
  return `addon:${slotName}:${direction}`
}

export function parseAddonSlotId(slotId: string): { name: string; direction: 'input' | 'output' } | null {
  const match = /^addon:([^:]+):(input|output)$/.exec(slotId)
  if (!match) {
    return null
  }
  return { name: match[1], direction: match[2] as 'input' | 'output' }
}

export function listAddonSlotEndpoints(
  canvasNode: CanvasNode,
  manifest: AddonManifest,
): AddonSlotEndpoint[] {
  if (!canvasNode.addonViewActive || !canvasNode.addonInstance) {
    return []
  }

  return manifest.data.map((slot) => ({
    nodeId: canvasNode.id,
    slotId: addonSlotId(slot.name, slot.direction),
    slotName: slot.name,
    direction: slot.direction,
    type: slot.type,
  }))
}

import { classifyAddonSlotConnectionExtended } from './crossSlotConnections'

export function classifyAddonSlotConnection(
  from: AddonSlotEndpoint,
  to: AddonSlotEndpoint,
): { kind: 'compatible' } | { kind: 'forced' } | { kind: 'incompatible' } {
  return classifyAddonSlotConnectionExtended(from, to)
}

export function findAddonSlotEndpoint(
  canvasNode: CanvasNode,
  manifest: AddonManifest,
  slotId: string,
): AddonSlotEndpoint | undefined {
  return listAddonSlotEndpoints(canvasNode, manifest).find((entry) => entry.slotId === slotId)
}

export function isAddonSlotConnection(connection: CanvasConnection): boolean {
  return Boolean(connection.fromAddonSlotId || connection.toAddonSlotId)
}

export function findConnectionForAddonSlot(
  scene: Pick<CanvasScene, 'connections'>,
  nodeId: string,
  slotId: string,
): CanvasConnection | undefined {
  return scene.connections.find(
    (connection) =>
      (connection.fromNodeId === nodeId && connection.fromAddonSlotId === slotId) ||
      (connection.toNodeId === nodeId && connection.toAddonSlotId === slotId),
  )
}

export function withoutConnectionsToAddonInputSlot(
  connections: readonly CanvasConnection[],
  toNodeId: string,
  toAddonSlotId: string,
): CanvasConnection[] {
  return connections.filter(
    (connection) =>
      !(
        isAddonSlotConnection(connection) &&
        connection.toNodeId === toNodeId &&
        connection.toAddonSlotId === toAddonSlotId
      ),
  )
}

export function applyAddonSlotConnectionToScene(
  scene: CanvasScene,
  request: AddonSlotLinkRequest,
): CanvasScene | null {
  const { fromNodeId, fromAddonSlotId, toNodeId, toAddonSlotId, allowForced = false } = request

  const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
  const toNode = scene.nodes.find((node) => node.id === toNodeId)
  if (!fromNode?.addonInstance || !toNode?.addonInstance) {
    return null
  }

  const connectionId = `addon:${fromNodeId}:${fromAddonSlotId}->${toNodeId}:${toAddonSlotId}`
  if (scene.connections.some((connection) => connection.id === connectionId)) {
    return scene
  }

  const fromManifest = getAddonManifest(fromNode.addonInstance.addonId)
  const toManifest = getAddonManifest(toNode.addonInstance.addonId)
  if (!fromManifest || !toManifest) {
    return null
  }
  const fromEp = findAddonSlotEndpoint(fromNode, fromManifest, fromAddonSlotId)
  const toEp = findAddonSlotEndpoint(toNode, toManifest, toAddonSlotId)
  if (!fromEp || !toEp) {
    return null
  }
  const connectionClass = classifyAddonSlotConnection(fromEp, toEp)
  if (connectionClass.kind === 'incompatible') {
    return null
  }
  if (connectionClass.kind === 'forced' && !allowForced) {
    return null
  }

  const connection: CanvasConnection = {
    id: connectionId,
    fromNodeId,
    fromInternalStructureId: `__addon__:${fromAddonSlotId}`,
    toNodeId,
    routing: 'flex',
    fromAddonSlotId,
    toAddonSlotId,
    ...(connectionClass.kind === 'forced' ? { forced: true } : {}),
  }

  const connections = withoutConnectionsToAddonInputSlot(
    scene.connections,
    toNodeId,
    toAddonSlotId,
  )

  return {
    ...scene,
    connections: [...connections, connection],
  }
}

export function estimateAddonCardHeight(manifest: AddonManifest): number {
  const slotRows = Math.max(manifest.data.length, 1)
  const slotDockHeight = slotRows * 22 + 8
  return (
    STRUCTURE_CARD_HEADER_HEIGHT +
    STRUCTURE_CARD_DIVIDER_HEIGHT +
    slotDockHeight +
    ADDON_CARD_BODY_MIN_HEIGHT
  )
}

function slotIndexInManifest(manifest: AddonManifest, slotId: string): number {
  const parsed = parseAddonSlotId(slotId)
  if (!parsed) {
    return -1
  }
  return manifest.data.findIndex(
    (slot) => slot.name === parsed.name && slot.direction === parsed.direction,
  )
}

export function getAddonSlotPortYOffset(manifest: AddonManifest, slotId: string): number | null {
  const index = slotIndexInManifest(manifest, slotId)
  if (index < 0) {
    return null
  }
  // Alinhado com AddonCard.module.css: header 36px + border 1px, slotsDock padding-top 4px, row 22px
  const slotDockTop = STRUCTURE_CARD_HEADER_HEIGHT + 1 + 4
  return slotDockTop + index * 22 + 11
}

export function resolveAddonSlotCanvasPoint(
  canvasNode: CanvasNode,
  manifest: AddonManifest,
  slotId: string,
  direction: 'input' | 'output',
  cardWidth = ADDON_CARD_WIDTH,
  slotAnchors?: ReadonlyMap<string, GraphPanPoint>,
): CanvasPosition | null {
  if (!canvasNode.addonViewActive || !canvasNode.addonInstance) {
    return null
  }

  const anchor = slotAnchors?.get(addonSlotAnchorKey(canvasNode.id, slotId))
  if (anchor) {
    return anchor
  }

  const yOffset = getAddonSlotPortYOffset(manifest, slotId)
  if (yOffset === null) {
    return null
  }

  const x =
    direction === 'output'
      ? canvasNode.position.x + cardWidth - ADDON_SLOT_EDGE_INSET
      : canvasNode.position.x + ADDON_SLOT_EDGE_INSET

  return { x, y: canvasNode.position.y + yOffset }
}

export function findAddonSlotAtPoint(
  nodes: readonly CanvasNode[],
  getManifest: (addonId: string) => AddonManifest | undefined,
  point: CanvasPosition,
  hitRadius = ADDON_SLOT_HIT_RADIUS,
  slotAnchors?: ReadonlyMap<string, GraphPanPoint>,
  getCardWidth?: (nodeId: string) => number,
): AddonSlotHit | null {
  let closest: { hit: AddonSlotHit; distance: number } | null = null

  for (const node of nodes) {
    if (!node.addonViewActive || !node.addonInstance) {
      continue
    }
    const manifest = getManifest(node.addonInstance.addonId)
    if (!manifest) {
      continue
    }

    for (const endpoint of listAddonSlotEndpoints(node, manifest)) {
      const cardWidth = getCardWidth?.(node.id) ?? ADDON_CARD_WIDTH
      const slotPoint = resolveAddonSlotCanvasPoint(
        node,
        manifest,
        endpoint.slotId,
        endpoint.direction,
        cardWidth,
        slotAnchors,
      )
      if (!slotPoint) {
        continue
      }

      const distance = Math.hypot(point.x - slotPoint.x, point.y - slotPoint.y)
      if (distance > hitRadius) {
        continue
      }

      if (!closest || distance < closest.distance) {
        closest = {
          distance,
          hit: {
            nodeId: endpoint.nodeId,
            slotId: endpoint.slotId,
            slotName: endpoint.slotName,
            direction: endpoint.direction,
          },
        }
      }
    }
  }

  return closest?.hit ?? null
}

export function resolveAddonConnectionPath(
  connection: CanvasConnection,
  nodes: readonly CanvasNode[],
  getManifest: (addonId: string) => AddonManifest | undefined,
  getCardWidth?: (nodeId: string) => number,
  slotAnchors?: ReadonlyMap<string, GraphPanPoint>,
): AddonConnectionPath | null {
  if (!connection.fromAddonSlotId || !connection.toAddonSlotId) {
    return null
  }

  const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
  const toNode = nodes.find((node) => node.id === connection.toNodeId)
  if (!fromNode?.addonInstance || !toNode?.addonInstance) {
    return null
  }

  const fromManifest = getManifest(fromNode.addonInstance.addonId)
  const toManifest = getManifest(toNode.addonInstance.addonId)
  if (!fromManifest || !toManifest) {
    return null
  }

  const fromPoint = resolveAddonSlotCanvasPoint(
    fromNode,
    fromManifest,
    connection.fromAddonSlotId,
    'output',
    getCardWidth?.(fromNode.id) ?? ADDON_CARD_WIDTH,
    slotAnchors,
  )
  const toPoint = resolveAddonSlotCanvasPoint(
    toNode,
    toManifest,
    connection.toAddonSlotId,
    'input',
    getCardWidth?.(toNode.id) ?? ADDON_CARD_WIDTH,
    slotAnchors,
  )
  if (!fromPoint || !toPoint) {
    return null
  }

  const routing = connection.routing ?? 'wireless'

  return {
    id: connection.id,
    d: buildSlotWirePathD(fromPoint, toPoint, routing),
    routing,
    forced: connection.forced,
  }
}

export function createAddonDraftConnectionPath(sx: number, sy: number, tx: number, ty: number): string {
  const midX = (sx + tx) / 2
  return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`
}

/** Ligações que envolvem pelo menos um slot de add-on (inclui mistas bloco↔add-on). */
export function connectionInvolvesAddon(connection: CanvasConnection): boolean {
  return Boolean(connection.fromAddonSlotId || connection.toAddonSlotId)
}

export function resolveAddonInvolvedConnectionPath(
  connection: CanvasConnection,
  nodes: readonly CanvasNode[],
  getManifest: (addonId: string) => AddonManifest | undefined,
  getCardWidth?: (nodeId: string) => number,
  slotAnchors?: ReadonlyMap<string, GraphPanPoint>,
): AddonConnectionPath | null {
  if (connection.fromAddonSlotId && connection.toAddonSlotId) {
    return resolveAddonConnectionPath(connection, nodes, getManifest, getCardWidth, slotAnchors)
  }

  const fromNode = nodes.find((n) => n.id === connection.fromNodeId)
  const toNode = nodes.find((n) => n.id === connection.toNodeId)
  if (!fromNode || !toNode) {
    return null
  }

  let fromPoint: CanvasPosition | null = null
  let toPoint: CanvasPosition | null = null

  if (connection.fromAddonSlotId && fromNode.addonInstance) {
    const manifest = getManifest(fromNode.addonInstance.addonId)
    if (manifest) {
      fromPoint = resolveAddonSlotCanvasPoint(
        fromNode,
        manifest,
        connection.fromAddonSlotId,
        'output',
        getCardWidth?.(fromNode.id) ?? ADDON_CARD_WIDTH,
        slotAnchors,
      )
    }
  } else if (connection.fromBlockSlotId && fromNode.blockStructure) {
    const width = resolveBlockCardWidth(fromNode)
    fromPoint = resolveBlockSlotCanvasPoint(fromNode, connection.fromBlockSlotId, 'output', width)
  }

  if (connection.toAddonSlotId && toNode.addonInstance) {
    const manifest = getManifest(toNode.addonInstance.addonId)
    if (manifest) {
      toPoint = resolveAddonSlotCanvasPoint(
        toNode,
        manifest,
        connection.toAddonSlotId,
        'input',
        getCardWidth?.(toNode.id) ?? ADDON_CARD_WIDTH,
        slotAnchors,
      )
    }
  } else if (connection.toBlockSlotId && toNode.blockStructure) {
    const width = resolveBlockCardWidth(toNode)
    toPoint = resolveBlockSlotCanvasPoint(toNode, connection.toBlockSlotId, 'input', width)
  }

  if (!fromPoint || !toPoint) {
    return null
  }

  const routing = connection.routing ?? 'wireless'

  return {
    id: connection.id,
    d: buildSlotWirePathD(fromPoint, toPoint, routing),
    routing,
    forced: connection.forced,
  }
}

export function slotByName(manifest: AddonManifest, name: string, direction: 'input' | 'output'): AddonSlot | undefined {
  return manifest.data.find((slot) => slot.name === name && slot.direction === direction)
}

/** Nomes dos slots de entrada que têm fio ligado neste add-on. */
export function resolveWiredAddonInputSlotNames(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  manifest: AddonManifest,
): ReadonlySet<string> {
  const names = new Set<string>()

  for (const connection of scene.connections) {
    if (connection.toNodeId !== canvasNode.id || !connection.toAddonSlotId) {
      continue
    }
    const parsed = parseAddonSlotId(connection.toAddonSlotId)
    if (!parsed || parsed.direction !== 'input') {
      continue
    }
    if (slotByName(manifest, parsed.name, 'input')) {
      names.add(parsed.name)
    }
  }

  return names
}
