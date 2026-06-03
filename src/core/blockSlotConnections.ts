import type {
  CanvasConnection,
  CanvasNode,
  CanvasPosition,
  CanvasScene,
  ConnectionRouting,
} from './canvasScene'
import { applyBlockStructureToNodeValues } from './syncBlockToCode'
import type { BlockSlotRules, BlockStructurePayload } from './blockSchema'
import {
  expandBlockHeaderSlotPorts,
  parseBlockHeaderSlotDescriptor,
  blockHeaderPortStackOffsetY,
  resolveBlockHeaderSlotsForStructure,
} from './blockCardHeaderSlots'
import { blockDefinitionByBlockName } from './blockDefinitionRegistry'
import { BLOCK_CARD_WIDTH, blockParameterSlotId, parseBlockHeaderSlotId } from './blockSchema'
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
  routing: ConnectionRouting
  forced?: boolean
}

export type BlockSlotConnectionClass =
  | { kind: 'compatible' }
  | { kind: 'forced' }
  | { kind: 'incompatible' }

export type BlockSlotEndpoint = {
  nodeId: string
  slotId: string
  direction: 'input' | 'output'
  types: string[]
  kind: 'header' | 'parameter'
  parameterId?: string
}

function parseSlotDescriptor(descriptor: string): { direction: 'input' | 'output'; types: string[] } | null {
  return parseBlockHeaderSlotDescriptor(descriptor)
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
  const headerSlots = resolveBlockHeaderSlotsForStructure(structure)

  for (const port of expandBlockHeaderSlotPorts(structure.blockType, headerSlots)) {
    endpoints.push({
      nodeId: canvasNode.id,
      slotId: port.slotId,
      direction: port.direction,
      types: port.types,
      kind: 'header',
    })
  }

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

function normalizeSlotType(value: string): string {
  return value.trim().toLowerCase().replace(/preview$/i, '')
}

function resolveParentBlockField(structure: BlockStructurePayload): string | undefined {
  const fromAppearance = structure.appearance?.parentBlockField?.trim()
  if (fromAppearance) {
    return fromAppearance
  }
  return blockDefinitionByBlockName(structure.blockType)?.block.trim() || undefined
}

function headerSlotTypes(
  structure: BlockStructurePayload,
  direction: 'input' | 'output',
): string[] {
  const parsedDirection = direction === 'input' ? 'input' : 'output'
  return resolveBlockHeaderSlotsForStructure(structure)
    .map((descriptor) => parseBlockHeaderSlotDescriptor(descriptor))
    .filter(
      (parsed): parsed is NonNullable<ReturnType<typeof parseBlockHeaderSlotDescriptor>> =>
        parsed !== null && parsed.direction === parsedDirection,
    )
    .flatMap((parsed) => parsed.types)
}

/** Cabeçalho OUT → cabeçalho IN entre blocos (filho `in[campoPai]`). */
function canConnectBlockHeaderToHeader(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  _fromStructure: BlockStructurePayload,
  toStructure: BlockStructurePayload,
): boolean {
  const childInTypes = headerSlotTypes(toStructure, 'input')
  return childInTypes.some((inType) =>
    from.types.some(
      (outType) => normalizeSlotType(outType) === normalizeSlotType(inType),
    ),
  )
}

function acceptedParentFieldsForHeaderInput(
  to: BlockSlotEndpoint,
  toStructure: BlockStructurePayload,
): string[] {
  const childInTypes = to.types.length > 0 ? to.types : headerSlotTypes(toStructure, 'input')
  const accepted = childInTypes.length > 0 ? childInTypes : [resolveParentBlockField(toStructure)]
  return accepted.filter((field): field is string => Boolean(field?.trim()))
}

function blockParameterOutputToHeaderInput(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  fromStructure: BlockStructurePayload,
  toStructure: BlockStructurePayload,
): { fieldMatches: boolean; typeMatchesChild: boolean } {
  const acceptedParentFields = acceptedParentFieldsForHeaderInput(to, toStructure)
  if (acceptedParentFields.length === 0) {
    return { fieldMatches: false, typeMatchesChild: false }
  }

  const fromParam = fromStructure.parameters.find((entry) => entry.idParameter === from.parameterId)
  if (!fromParam) {
    return { fieldMatches: false, typeMatchesChild: false }
  }

  const outTypes = typesFromRules(fromParam.slotRules, 'output')
  const paramName = fromParam.nameParameter.trim() || fromParam.idParameter
  const childBlockType = toStructure.blockType.trim()

  const fieldMatches = acceptedParentFields.some((field) => {
    const safeField = field.trim()
    return paramName === safeField || normalizeSlotType(paramName) === normalizeSlotType(safeField)
  })

  const typeMatchesChild = outTypes.some(
    (type) => type === childBlockType || normalizeSlotType(type) === normalizeSlotType(childBlockType),
  )

  return { fieldMatches, typeMatchesChild }
}

/** Slot de parâmetro OUT (embed/pointer) → cabeçalho IN do bloco filho. */
function canConnectBlockParameterToHeader(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  fromStructure: BlockStructurePayload,
  toStructure: BlockStructurePayload,
): boolean {
  const { fieldMatches, typeMatchesChild } = blockParameterOutputToHeaderInput(
    from,
    to,
    fromStructure,
    toStructure,
  )
  return fieldMatches && typeMatchesChild
}

/** Cabeçalho OUT → slot IN de parâmetro no bloco filho. */
function canConnectBlockHeaderToParameter(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  toStructure: BlockStructurePayload,
): boolean {
  const childBlockType = toStructure.blockType.trim()
  return from.types.some((outType) =>
    to.types.some(
      (inType) =>
        normalizeSlotType(outType) === normalizeSlotType(inType) ||
        normalizeSlotType(inType) === normalizeSlotType(childBlockType),
    ),
  )
}

export function canConnectBlockSlots(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  fromStructure?: BlockStructurePayload,
  toStructure?: BlockStructurePayload,
): boolean {
  if (from.nodeId === to.nodeId) {
    return false
  }
  if (from.direction !== 'output' || to.direction !== 'input') {
    return false
  }

  if (from.kind === 'parameter' && to.kind === 'parameter') {
    return typesCompatible(from.types, to.types)
  }

  if (typesCompatible(from.types, to.types)) {
    return true
  }

  if (!fromStructure || !toStructure) {
    return false
  }

  if (from.kind === 'header' && to.kind === 'header') {
    return canConnectBlockHeaderToHeader(from, to, fromStructure, toStructure)
  }

  if (from.kind === 'parameter' && to.kind === 'header') {
    return canConnectBlockParameterToHeader(from, to, fromStructure, toStructure)
  }

  if (from.kind === 'header' && to.kind === 'parameter') {
    return canConnectBlockHeaderToParameter(from, to, toStructure)
  }

  return false
}

/**
 * O IN do destino aceita o campo pai, mas o OUT de origem não corresponde ao tipo do bloco filho.
 * Ex.: dynamics → in[dynamics] com saída VfxAnimatedVector3f ligada a VfxAnimatedColorVariableData.
 */
export function classifyBlockSlotConnection(
  from: BlockSlotEndpoint,
  to: BlockSlotEndpoint,
  fromStructure?: BlockStructurePayload,
  toStructure?: BlockStructurePayload,
): BlockSlotConnectionClass {
  if (canConnectBlockSlots(from, to, fromStructure, toStructure)) {
    return { kind: 'compatible' }
  }

  if (!fromStructure || !toStructure) {
    return { kind: 'incompatible' }
  }

  if (from.kind === 'parameter' && to.kind === 'header') {
    const { fieldMatches, typeMatchesChild } = blockParameterOutputToHeaderInput(
      from,
      to,
      fromStructure,
      toStructure,
    )
    if (fieldMatches && !typeMatchesChild) {
      return { kind: 'forced' }
    }
  }

  return { kind: 'incompatible' }
}

export type BlockSlotLinkRequest = {
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
  toNodeId: string
  toBlockSlotId: string
  toBlockParameterId?: string
  allowForced?: boolean
}

/** Origem da ligação ao criar bloco a partir da paleta «LINK NEW NODE». */
export type BlockDefinitionSpawnLinkContext = {
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
  fromParameterName?: string
  outTypes: readonly string[]
}

/** Aplica ligação entre slots de bloco numa cena (útil após criar o nó destino na mesma transação). */
export function applyBlockSlotConnectionToScene(
  scene: CanvasScene,
  request: BlockSlotLinkRequest,
): CanvasScene | null {
  const {
    fromNodeId,
    fromBlockSlotId,
    fromBlockParameterId,
    toNodeId,
    toBlockSlotId,
    toBlockParameterId,
    allowForced = false,
  } = request

  const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
  const toNode = scene.nodes.find((node) => node.id === toNodeId)
  if (!fromNode?.blockStructure || !toNode?.blockStructure) {
    return null
  }

  const fromEndpoint = findBlockSlotEndpoint(fromNode, fromBlockSlotId)
  const toEndpoint = findBlockSlotEndpoint(toNode, toBlockSlotId)
  if (!fromEndpoint || !toEndpoint) {
    return null
  }

  const connectionClass = classifyBlockSlotConnection(
    fromEndpoint,
    toEndpoint,
    fromNode.blockStructure,
    toNode.blockStructure,
  )
  if (connectionClass.kind === 'incompatible') {
    return null
  }
  if (connectionClass.kind === 'forced' && !allowForced) {
    return null
  }

  const connectionId = `block:${fromNodeId}:${fromBlockSlotId}->${toNodeId}:${toBlockSlotId}`
  if (scene.connections.some((connection) => connection.id === connectionId)) {
    return scene
  }

  let nextFromStructure = fromNode.blockStructure
  let nextToStructure = toNode.blockStructure

  if (fromBlockParameterId && toBlockParameterId) {
    const propagated = propagateBlockConnectionValue(
      fromNode.blockStructure,
      toNode.blockStructure,
      fromBlockParameterId,
      toBlockParameterId,
    )
    if (propagated) {
      nextFromStructure = propagated.source
      nextToStructure = propagated.target
    }
  }

  const connection: CanvasConnection = {
    id: connectionId,
    fromNodeId,
    fromInternalStructureId: `__block__:${fromBlockSlotId}`,
    toNodeId,
    routing: 'wireless',
    fromBlockSlotId,
    ...(fromBlockParameterId ? { fromBlockParameterId } : {}),
    toBlockSlotId,
    ...(toBlockParameterId ? { toBlockParameterId } : {}),
    ...(connectionClass.kind === 'forced' ? { forced: true } : {}),
  }

  const fromApplied = applyBlockStructureToNodeValues(scene, {
    ...fromNode,
    blockStructure: nextFromStructure,
  }, nextFromStructure)
  const toApplied = applyBlockStructureToNodeValues(scene, {
    ...toNode,
    blockStructure: nextToStructure,
  }, nextToStructure)

  const childPatchMap = new Map(
    [...fromApplied.childPatches, ...toApplied.childPatches].map((patch) => [patch.nodeId, patch.node]),
  )

  const connections = withoutConnectionsToBlockInputSlot(scene.connections, toNodeId, toBlockSlotId)

  return {
    ...scene,
    connections: [...connections, connection],
    nodes: scene.nodes.map((node) => {
      if (node.id === fromNodeId) {
        return { ...node, blockStructure: nextFromStructure, node: fromApplied.node }
      }
      if (node.id === toNodeId) {
        return { ...node, blockStructure: nextToStructure, node: toApplied.node }
      }
      const childPatch = childPatchMap.get(node.id)
      if (childPatch) {
        return { ...node, node: childPatch }
      }
      return node
    }),
  }
}

export function findBlockSlotEndpoint(
  canvasNode: CanvasNode,
  slotId: string,
): BlockSlotEndpoint | undefined {
  const listed = listBlockSlotEndpoints(canvasNode).find((entry) => entry.slotId === slotId)
  if (listed) {
    return listed
  }

  if (!canvasNode.blockStructure || !canvasNode.blockViewActive) {
    return undefined
  }

  const match = /^block-param:([^:]+):(input|output)$/.exec(slotId)
  if (!match) {
    return undefined
  }

  const paramId = match[1]
  const direction = match[2] as 'input' | 'output'
  const param = canvasNode.blockStructure.parameters.find((entry) => entry.idParameter === paramId)
  if (!param?.slotRules) {
    return undefined
  }

  const types =
    direction === 'output' ? (param.slotRules.outputs ?? []) : (param.slotRules.inputs ?? [])
  if (types.length === 0) {
    return undefined
  }

  return {
    nodeId: canvasNode.id,
    slotId,
    direction,
    types,
    kind: 'parameter',
    parameterId: paramId,
  }
}

export function isBlockSlotConnection(connection: CanvasConnection): boolean {
  return Boolean(connection.fromBlockParameterId || connection.toBlockParameterId || connection.fromBlockSlotId || connection.toBlockSlotId)
}

export function blockConnectionUsesSlot(connection: CanvasConnection, slotId: string): boolean {
  return connection.fromBlockSlotId === slotId || connection.toBlockSlotId === slotId
}

export function findConnectionForBlockSlot(
  scene: Pick<CanvasScene, 'connections'>,
  nodeId: string,
  slotId: string,
): CanvasConnection | undefined {
  return scene.connections.find(
    (connection) =>
      (connection.fromNodeId === nodeId && connection.fromBlockSlotId === slotId) ||
      (connection.toNodeId === nodeId && connection.toBlockSlotId === slotId),
  )
}

/** Uma entrada de bloco só pode ter uma ligação — remove a anterior ao mesmo `toBlockSlotId`. */
export function withoutConnectionsToBlockInputSlot(
  connections: readonly CanvasConnection[],
  toNodeId: string,
  toBlockSlotId: string,
): CanvasConnection[] {
  return connections.filter(
    (connection) =>
      !(
        isBlockSlotConnection(connection) &&
        connection.toNodeId === toNodeId &&
        connection.toBlockSlotId === toBlockSlotId
      ),
  )
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

/** Rodapé com botão «Parâmetro» (ver BlockCard.module.css). */
export const BLOCK_CARD_FOOTER_HEIGHT = 44

export function estimateBlockCardHeight(structure: BlockStructurePayload): number {
  const bodyRows = Math.max(structure.parameters.length, 0)
  const bodyHeight =
    bodyRows > 0
      ? STRUCTURE_CARD_BODY_PADDING_Y * 2 + bodyRows * STRUCTURE_CARD_ROW_HEIGHT
      : 0

  return (
    STRUCTURE_CARD_HEADER_HEIGHT +
    STRUCTURE_CARD_DIVIDER_HEIGHT +
    bodyHeight +
    BLOCK_CARD_FOOTER_HEIGHT
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

  const headerSlots = resolveBlockHeaderSlotsForStructure(structure)
  const ports = expandBlockHeaderSlotPorts(structure.blockType, headerSlots)
  const port = ports.find((entry) => entry.slotId === slotId)
  if (port) {
    const stackOffset = blockHeaderPortStackOffsetY(ports, port)
    return headerHeight / 2 + stackOffset
  }

  const parsedSlotId = parseBlockHeaderSlotId(slotId)
  if (parsedSlotId) {
    const descriptor = headerSlots[parsedSlotId.slotIndex]
    const parsed = parseBlockHeaderSlotDescriptor(descriptor ?? '')
    if (parsed) {
      const matchedPort = ports.find((entry) => entry.slotId === slotId)
      if (matchedPort) {
        return headerHeight / 2 + blockHeaderPortStackOffsetY(ports, matchedPort)
      }
      return headerHeight / 2
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
  const routing = connection.routing ?? 'wireless'

  const forced = connection.forced === true

  if (routing === 'rigid') {
    const bendX = (start.x + end.x) / 2
    return {
      id: connection.id,
      routing,
      forced,
      d: [
        `M ${start.x} ${start.y}`,
        `L ${bendX} ${start.y}`,
        `L ${bendX} ${end.y}`,
        `L ${end.x} ${end.y}`,
      ].join(' '),
    }
  }

  return {
    id: connection.id,
    routing,
    forced,
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
