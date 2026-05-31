import type { CanvasConnection, CanvasNode, CanvasPosition } from './canvasScene'
import type { BlockSlotRules, BlockStructurePayload } from './blockSchema'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import { BLOCK_CARD_WIDTH, blockHeaderSlotId, blockParameterSlotId } from './blockSchema'
import {
  resolveBlockCardWidth,
  STRUCTURE_CARD_BODY_PADDING_Y,
  STRUCTURE_CARD_DIVIDER_HEIGHT,
  STRUCTURE_CARD_HEADER_HEIGHT,
  STRUCTURE_CARD_ROW_HEIGHT,
} from './structureCardLayout'

export { BLOCK_CARD_WIDTH }

const BLOCK_SLOT_EDGE_INSET = 10
const BLOCK_SLOT_HIT_RADIUS = 14

export type BlockSlotHit = {
  nodeId: string
  slotId: string
  direction: 'input' | 'output'
  parameterId?: string
}

export type BlockConnectionPath = {
  id: string
  d: string
}

export type BlockSlotEndpoint = {
  nodeId: string
  slotId: string
  direction: 'input' | 'output'
  types: string[]
  kind: 'header' | 'parameter'
  parameterId?: string
}

function parseSlotDescriptor(descriptor: string): { direction: 'input' | 'output'; types: string[] } | null {
  const outputMatch = /^output\[(.+)\]$/.exec(descriptor)
  if (outputMatch) {
    return {
      direction: 'output',
      types: outputMatch[1].split(',').map((item) => item.trim()).filter(Boolean),
    }
  }
  const inputMatch = /^input\[(.+)\]$/.exec(descriptor)
  if (inputMatch) {
    return {
      direction: 'input',
      types: inputMatch[1].split(',').map((item) => item.trim()).filter(Boolean),
    }
  }
  return null
}

function typesFromRules(rules: BlockSlotRules | undefined, direction: 'input' | 'output'): string[] {
  if (direction === 'output') {
    return rules?.outputs ?? []
  }
  return rules?.inputs ?? []
}

export function listBlockSlotEndpoints(canvasNode: CanvasNode): BlockSlotEndpoint[] {
  if (!canvasNode.blockStructure || !canvasNode.blockViewActive) {
    return []
  }

  const structure = canvasNode.blockStructure
  const endpoints: BlockSlotEndpoint[] = []
  const typeDef = blockTypeDefinitionById(structure.blockType)

  typeDef?.headerSlots.forEach((descriptor, index) => {
    const parsed = parseSlotDescriptor(descriptor)
    if (!parsed) {
      return
    }
    endpoints.push({
      nodeId: canvasNode.id,
      slotId: blockHeaderSlotId(structure.blockType, index),
      direction: parsed.direction,
      types: parsed.types,
      kind: 'header',
    })
  })

  for (const param of structure.parameters) {
    const outputs = typesFromRules(param.slotRules, 'output')
    const inputs = typesFromRules(param.slotRules, 'input')

    if (outputs.length > 0) {
      endpoints.push({
        nodeId: canvasNode.id,
        slotId: blockParameterSlotId(param.idParameter, 'output'),
        direction: 'output',
        types: outputs,
        kind: 'parameter',
        parameterId: param.idParameter,
      })
    }

    if (inputs.length > 0) {
      endpoints.push({
        nodeId: canvasNode.id,
        slotId: blockParameterSlotId(param.idParameter, 'input'),
        direction: 'input',
        types: inputs,
        kind: 'parameter',
        parameterId: param.idParameter,
      })
    }
  }

  return endpoints
}

function typesCompatible(outputTypes: string[], inputTypes: string[]): boolean {
  if (outputTypes.length === 0 || inputTypes.length === 0) {
    return false
  }
  return outputTypes.some((outputType) =>
    inputTypes.some(
      (inputType) =>
        inputType === outputType ||
        inputType.toLowerCase().includes(outputType.toLowerCase()) ||
        outputType.toLowerCase().includes(inputType.toLowerCase()),
    ),
  )
}

export function canConnectBlockSlots(from: BlockSlotEndpoint, to: BlockSlotEndpoint): boolean {
  if (from.nodeId === to.nodeId) {
    return false
  }
  if (from.direction !== 'output' || to.direction !== 'input') {
    return false
  }
  return typesCompatible(from.types, to.types)
}

export function findBlockSlotEndpoint(
  canvasNode: CanvasNode,
  slotId: string,
): BlockSlotEndpoint | undefined {
  return listBlockSlotEndpoints(canvasNode).find((entry) => entry.slotId === slotId)
}

export function isBlockSlotConnection(connection: CanvasConnection): boolean {
  return Boolean(connection.fromBlockParameterId || connection.toBlockParameterId || connection.fromBlockSlotId || connection.toBlockSlotId)
}

export function blockConnectionUsesSlot(connection: CanvasConnection, slotId: string): boolean {
  return connection.fromBlockSlotId === slotId || connection.toBlockSlotId === slotId
}

export function propagateBlockConnectionValue(
  sourceStructure: BlockStructurePayload,
  targetStructure: BlockStructurePayload,
  fromParameterId: string,
  toParameterId: string,
): { source: BlockStructurePayload; target: BlockStructurePayload } | null {
  const sourceParam = sourceStructure.parameters.find((entry) => entry.idParameter === fromParameterId)
  const targetParam = targetStructure.parameters.find((entry) => entry.idParameter === toParameterId)
  if (!sourceParam || !targetParam) {
    return null
  }

  const nextTarget = {
    ...targetStructure,
    parameters: targetStructure.parameters.map((entry) =>
      entry.idParameter === toParameterId
        ? { ...entry, defaultValue: sourceParam.defaultValue }
        : entry,
    ),
  }

  return { source: sourceStructure, target: nextTarget }
}

export function estimateBlockCardHeight(structure: BlockStructurePayload): number {
  return (
    STRUCTURE_CARD_HEADER_HEIGHT +
    STRUCTURE_CARD_DIVIDER_HEIGHT +
    STRUCTURE_CARD_BODY_PADDING_Y * 2 +
    structure.parameters.length * STRUCTURE_CARD_ROW_HEIGHT
  )
}

export function getBlockSlotPortYOffset(
  structure: BlockStructurePayload,
  slotId: string,
): number | null {
  const headerHeight = STRUCTURE_CARD_HEADER_HEIGHT
  const dividerHeight = STRUCTURE_CARD_DIVIDER_HEIGHT
  const bodyPaddingY = STRUCTURE_CARD_BODY_PADDING_Y
  const rowHeight = STRUCTURE_CARD_ROW_HEIGHT
  const bodyTop = headerHeight + dividerHeight + bodyPaddingY

  const typeDef = blockTypeDefinitionById(structure.blockType)
  if (typeDef) {
    for (let index = 0; index < typeDef.headerSlots.length; index += 1) {
      if (blockHeaderSlotId(structure.blockType, index) === slotId) {
        return headerHeight / 2
      }
    }
  }

  for (let index = 0; index < structure.parameters.length; index += 1) {
    const param = structure.parameters[index]
    const y = bodyTop + index * rowHeight + rowHeight / 2
    if (
      blockParameterSlotId(param.idParameter, 'input') === slotId ||
      blockParameterSlotId(param.idParameter, 'output') === slotId
    ) {
      return y
    }
  }

  return null
}

export function resolveBlockSlotCanvasPoint(
  canvasNode: CanvasNode,
  slotId: string,
  direction: 'input' | 'output',
  cardWidth = BLOCK_CARD_WIDTH,
): CanvasPosition | null {
  if (!canvasNode.blockStructure || !canvasNode.blockViewActive) {
    return null
  }

  const yOffset = getBlockSlotPortYOffset(canvasNode.blockStructure, slotId)
  if (yOffset === null) {
    return null
  }

  const x =
    direction === 'output'
      ? canvasNode.position.x + cardWidth - BLOCK_SLOT_EDGE_INSET
      : canvasNode.position.x + BLOCK_SLOT_EDGE_INSET

  return { x, y: canvasNode.position.y + yOffset }
}

export function findBlockSlotAtPoint(
  nodes: readonly CanvasNode[],
  point: CanvasPosition,
  hitRadius = BLOCK_SLOT_HIT_RADIUS,
): BlockSlotHit | null {
  let closest: { hit: BlockSlotHit; distance: number } | null = null

  for (const node of nodes) {
    if (!node.blockViewActive || !node.blockStructure) {
      continue
    }

    for (const endpoint of listBlockSlotEndpoints(node)) {
      const width = resolveBlockCardWidth(node)
      const slotPoint = resolveBlockSlotCanvasPoint(node, endpoint.slotId, endpoint.direction, width)
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
            direction: endpoint.direction,
            parameterId: endpoint.parameterId,
          },
        }
      }
    }
  }

  return closest?.hit ?? null
}

export function resolveBlockConnectionPath(
  connection: CanvasConnection,
  nodes: readonly CanvasNode[],
): BlockConnectionPath | null {
  if (!connection.fromBlockSlotId || !connection.toBlockSlotId) {
    return null
  }

  const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
  const toNode = nodes.find((node) => node.id === connection.toNodeId)
  if (!fromNode || !toNode) {
    return null
  }

  const fromWidth = resolveBlockCardWidth(fromNode)
  const toWidth = resolveBlockCardWidth(toNode)
  const start = resolveBlockSlotCanvasPoint(fromNode, connection.fromBlockSlotId, 'output', fromWidth)
  const end = resolveBlockSlotCanvasPoint(toNode, connection.toBlockSlotId, 'input', toWidth)
  if (!start || !end) {
    return null
  }

  const exitX = start.x + 24
  const entryX = end.x - 24
  const curveOffset = Math.max(48, Math.abs(entryX - exitX) * 0.35)

  return {
    id: connection.id,
    d: [
      `M ${start.x} ${start.y}`,
      `L ${exitX} ${start.y}`,
      `C ${exitX + curveOffset} ${start.y}, ${entryX - curveOffset} ${end.y}, ${entryX} ${end.y}`,
      `L ${end.x} ${end.y}`,
    ].join(' '),
  }
}

export function createBlockDraftConnectionPath(sx: number, sy: number, ex: number, ey: number): string {
  const exitX = sx + 24
  const entryX = ex - 24
  const curveOffset = Math.max(48, Math.abs(entryX - exitX) * 0.35)

  return [
    `M ${sx} ${sy}`,
    `L ${exitX} ${sy}`,
    `C ${exitX + curveOffset} ${sy}, ${entryX - curveOffset} ${ey}, ${entryX} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(' ')
}
