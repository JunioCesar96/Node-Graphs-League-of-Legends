import type { CanvasConnection, CanvasNode, CanvasPosition } from './canvasScene'
import type { GroupSlotRules, GroupStructurePayload } from './groupSchema'
import { groupTypeDefinitionById } from './groupStructureRegistry'
import { GROUP_CARD_WIDTH, groupHeaderSlotId, groupParameterSlotId } from './groupSchema'
import {
  resolveGroupCardWidth,
  STRUCTURE_CARD_BODY_PADDING_Y,
  STRUCTURE_CARD_DIVIDER_HEIGHT,
  STRUCTURE_CARD_HEADER_HEIGHT,
  STRUCTURE_CARD_ROW_HEIGHT,
} from './structureCardLayout'

export { GROUP_CARD_WIDTH }

const Group_SLOT_EDGE_INSET = 10
const Group_SLOT_HIT_RADIUS = 14

export type GroupSlotHit = {
  nodeId: string
  slotId: string
  direction: 'input' | 'output'
  parameterId?: string
}

export type GroupConnectionPath = {
  id: string
  d: string
}

export type GroupSlotEndpoint = {
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

function typesFromRules(rules: GroupSlotRules | undefined, direction: 'input' | 'output'): string[] {
  if (direction === 'output') {
    return rules?.outputs ?? []
  }
  return rules?.inputs ?? []
}

export function listGroupSlotEndpoints(canvasNode: CanvasNode): GroupSlotEndpoint[] {
  if (!canvasNode.groupStructure || !canvasNode.groupViewActive) {
    return []
  }

  const structure = canvasNode.groupStructure
  const endpoints: GroupSlotEndpoint[] = []
  const typeDef = groupTypeDefinitionById(structure.groupType)

  typeDef?.headerSlots.forEach((descriptor, index) => {
    const parsed = parseSlotDescriptor(descriptor)
    if (!parsed) {
      return
    }
    endpoints.push({
      nodeId: canvasNode.id,
      slotId: groupHeaderSlotId(structure.groupType, index),
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
        slotId: groupParameterSlotId(param.idParameter, 'output'),
        direction: 'output',
        types: outputs,
        kind: 'parameter',
        parameterId: param.idParameter,
      })
    }

    if (inputs.length > 0) {
      endpoints.push({
        nodeId: canvasNode.id,
        slotId: groupParameterSlotId(param.idParameter, 'input'),
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

export function canConnectGroupSlots(from: GroupSlotEndpoint, to: GroupSlotEndpoint): boolean {
  if (from.nodeId === to.nodeId) {
    return false
  }
  if (from.direction !== 'output' || to.direction !== 'input') {
    return false
  }
  return typesCompatible(from.types, to.types)
}

export function findGroupSlotEndpoint(
  canvasNode: CanvasNode,
  slotId: string,
): GroupSlotEndpoint | undefined {
  return listGroupSlotEndpoints(canvasNode).find((entry) => entry.slotId === slotId)
}

export function isGroupSlotConnection(connection: CanvasConnection): boolean {
  return Boolean(connection.fromGroupParameterId || connection.toGroupParameterId || connection.fromGroupSlotId || connection.toGroupSlotId)
}

export function GroupConnectionUsesSlot(connection: CanvasConnection, slotId: string): boolean {
  return connection.fromGroupSlotId === slotId || connection.toGroupSlotId === slotId
}

export function propagateGroupConnectionValue(
  sourceStructure: GroupStructurePayload,
  targetStructure: GroupStructurePayload,
  fromParameterId: string,
  toParameterId: string,
): { source: GroupStructurePayload; target: GroupStructurePayload } | null {
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

export function estimateGroupCardHeight(structure: GroupStructurePayload): number {
  return (
    STRUCTURE_CARD_HEADER_HEIGHT +
    STRUCTURE_CARD_DIVIDER_HEIGHT +
    STRUCTURE_CARD_BODY_PADDING_Y * 2 +
    structure.parameters.length * STRUCTURE_CARD_ROW_HEIGHT
  )
}

export function getGroupSlotPortYOffset(
  structure: GroupStructurePayload,
  slotId: string,
): number | null {
  const headerHeight = STRUCTURE_CARD_HEADER_HEIGHT
  const dividerHeight = STRUCTURE_CARD_DIVIDER_HEIGHT
  const bodyPaddingY = STRUCTURE_CARD_BODY_PADDING_Y
  const rowHeight = STRUCTURE_CARD_ROW_HEIGHT
  const bodyTop = headerHeight + dividerHeight + bodyPaddingY

  const typeDef = groupTypeDefinitionById(structure.groupType)
  if (typeDef) {
    for (let index = 0; index < typeDef.headerSlots.length; index += 1) {
      if (groupHeaderSlotId(structure.groupType, index) === slotId) {
        return headerHeight / 2
      }
    }
  }

  for (let index = 0; index < structure.parameters.length; index += 1) {
    const param = structure.parameters[index]
    const y = bodyTop + index * rowHeight + rowHeight / 2
    if (
      groupParameterSlotId(param.idParameter, 'input') === slotId ||
      groupParameterSlotId(param.idParameter, 'output') === slotId
    ) {
      return y
    }
  }

  return null
}

export function resolveGroupSlotCanvasPoint(
  canvasNode: CanvasNode,
  slotId: string,
  direction: 'input' | 'output',
  cardWidth = GROUP_CARD_WIDTH,
): CanvasPosition | null {
  if (!canvasNode.groupStructure || !canvasNode.groupViewActive) {
    return null
  }

  const yOffset = getGroupSlotPortYOffset(canvasNode.groupStructure, slotId)
  if (yOffset === null) {
    return null
  }

  const x =
    direction === 'output'
      ? canvasNode.position.x + cardWidth - Group_SLOT_EDGE_INSET
      : canvasNode.position.x + Group_SLOT_EDGE_INSET

  return { x, y: canvasNode.position.y + yOffset }
}

export function findGroupSlotAtPoint(
  nodes: readonly CanvasNode[],
  point: CanvasPosition,
  hitRadius = Group_SLOT_HIT_RADIUS,
): GroupSlotHit | null {
  let closest: { hit: GroupSlotHit; distance: number } | null = null

  for (const node of nodes) {
    if (!node.groupViewActive || !node.groupStructure) {
      continue
    }

    for (const endpoint of listGroupSlotEndpoints(node)) {
      const width = resolveGroupCardWidth(node)
      const slotPoint = resolveGroupSlotCanvasPoint(node, endpoint.slotId, endpoint.direction, width)
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

export function resolveGroupConnectionPath(
  connection: CanvasConnection,
  nodes: readonly CanvasNode[],
): GroupConnectionPath | null {
  if (!connection.fromGroupSlotId || !connection.toGroupSlotId) {
    return null
  }

  const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
  const toNode = nodes.find((node) => node.id === connection.toNodeId)
  if (!fromNode || !toNode) {
    return null
  }

  const fromWidth = resolveGroupCardWidth(fromNode)
  const toWidth = resolveGroupCardWidth(toNode)
  const start = resolveGroupSlotCanvasPoint(fromNode, connection.fromGroupSlotId, 'output', fromWidth)
  const end = resolveGroupSlotCanvasPoint(toNode, connection.toGroupSlotId, 'input', toWidth)
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

export function createGroupDraftConnectionPath(sx: number, sy: number, ex: number, ey: number): string {
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
