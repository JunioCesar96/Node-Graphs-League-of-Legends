import type { CanvasNode, CanvasScene } from './canvasScene'
import type {
  BlockGeneratedDocument,
  BlockInspectorDraft,
  BlockInspectorDraftEntry,
  BlockParameterDef,
  BlockParameterSourcePath,
  BlockStructurePayload,
} from './blockSchema'
import { resolvePointerSlotTargetType } from './blockParameterClassification'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import { iconIdFromDraft, isBlockInspectorPointerEntry, mandatoryPointerSlotTags, normalizeDraftEntrySlots, resolveBlockIconHint, slotTagsToRules } from './blockInspectorUi'
import { blockTokenFromParameterDef, parseBlockToken } from './blockTokenParser'
import { populatedSlotsForPointer } from './pointerSlots'
import type { NodeInstance, NodeParameterDefinition } from './nodeSchema'
import { isEmptyStructBlockSchema } from './nodeSchema'
import { normalizeLinkedParameterPairs } from './linked_parameter_values'
import type { ParameterValueLinkPair } from './link_parameter_value'

function nextParameterSequence(blockName: string, existing: readonly BlockParameterDef[]): string {
  const prefix = blockName.replace(/\s+/g, '')
  let max = 0
  for (const param of existing) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(param.idParameter)
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10))
    }
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}

export function nodeParameterValue(node: NodeInstance, parameterId: string): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? ''
}

export function resolveBlockParameterValue(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  sourcePath: BlockParameterSourcePath,
): string {
  if (sourcePath.kind === 'parameter') {
    const parameter = canvasNode.node.schema.parameters.find((p) => p.id === sourcePath.parameterId)
    const raw = nodeParameterValue(canvasNode.node, sourcePath.parameterId)
    const parsed = parseBlockToken(raw)
    if (parsed) {
      return parsed.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
    }
    return raw || parameter?.defaultValue || ''
  }

  if (sourcePath.kind === 'pointerChild') {
    return ''
  }

  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === canvasNode.id &&
      entry.fromInternalStructureId === sourcePath.slotId,
  )
  if (!connection) {
    return ''
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return ''
  }
  const raw = nodeParameterValue(child.node, sourcePath.childParameterId)
  const parsed = parseBlockToken(raw)
  if (parsed) {
    return parsed.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
  }
  return raw
}

export function writeBlockParameterValue(
  node: NodeInstance,
  sourcePath: BlockParameterSourcePath,
  tokenOrValue: string,
): NodeInstance {
  if (sourcePath.kind === 'parameter') {
    const hasValue = node.values.some((entry) => entry.parameterId === sourcePath.parameterId)
    const nextValues = hasValue
      ? node.values.map((entry) =>
          entry.parameterId === sourcePath.parameterId ? { ...entry, value: tokenOrValue } : entry,
        )
      : [...node.values, { parameterId: sourcePath.parameterId, value: tokenOrValue }]
    return { ...node, values: nextValues }
  }
  return node
}

/** Tipo de bloco por defeito: título do schema do nó (ex.: ValueFloat), não o primeiro tipo registado. */
export function defaultBlockTypeForCanvasNode(canvasNode: CanvasNode): {
  blockType: string
  blockTitle: string
} {
  const schemaTitle = canvasNode.node.schema.title.trim()
  const schemaId = canvasNode.node.schema.id.trim()
  const blockType = schemaTitle || schemaId || 'Block'
  const registered = blockTypeDefinitionById(blockType) ?? blockTypeDefinitionById(schemaId)
  const blockTitle = registered?.title ?? (schemaTitle || schemaId || blockType)
  return { blockType, blockTitle }
}

export function buildBlockInspectorDraftFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): BlockInspectorDraft {
  const { blockType, blockTitle } = defaultBlockTypeForCanvasNode(canvasNode)

  const entries: BlockInspectorDraftEntry[] = []

  for (const parameter of canvasNode.node.schema.parameters) {
    entries.push({
      sourcePath: { kind: 'parameter', parameterId: parameter.id },
      ritualName: parameter.name,
      typeParameter: ritualTypeFromNodeDataType(parameter.type),
      defaultValue: resolveBlockParameterValue(scene, canvasNode, {
        kind: 'parameter',
        parameterId: parameter.id,
      }),
      exposed: false,
      nameParameter: parameter.name,
      iconHint: parameter.type === 'string' && parameter.name.toLowerCase().includes('texture') ? 'Img' : null,
      iconId: parameter.type === 'string' && parameter.name.toLowerCase().includes('texture') ? 'Img' : '',
      slotTags: [],
    })
  }

  for (const embed of canvasNode.node.schema.embed ?? []) {
    const slot = embed.slots?.[0] ?? embed.internalStructures[0]
    if (!slot) {
      continue
    }
    const childConnection = scene.connections.find(
      (entry) => entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === slot.id,
    )
    const childNode = childConnection
      ? scene.nodes.find((entry) => entry.id === childConnection.toNodeId)
      : undefined
    const childParam = childNode?.node.schema.parameters.find((p) => p.name === 'constantValue')
    const structureName = slot.name.trim()
    entries.push({
      sourcePath: {
        kind: 'embedChild',
        embedId: embed.id,
        slotId: slot.id,
        childParameterId: childParam?.id ?? '',
      },
      ritualName: embed.title,
      typeParameter: childParam
        ? ritualTypeFromNodeDataType(childParam.type)
        : structureName,
      defaultValue: childParam
        ? childNode
          ? resolveBlockParameterValue(scene, canvasNode, {
              kind: 'embedChild',
              embedId: embed.id,
              slotId: slot.id,
              childParameterId: childParam.id,
            })
          : childParam.defaultValue
        : '',
      exposed: false,
      nameParameter: embed.title,
      iconHint:
        embed.title.toLowerCase().includes('color') || embed.title.toLowerCase().includes('texture')
          ? 'Img'
          : null,
      iconId:
        embed.title.toLowerCase().includes('color') || embed.title.toLowerCase().includes('texture')
          ? 'Img'
          : '',
      slotTags: [],
    })
  }

  for (const pointer of canvasNode.node.schema.pointer ?? []) {
    const slot = populatedSlotsForPointer(pointer)[0] ?? pointer.internalStructures[0]
    if (!slot) {
      continue
    }
    const fieldName = pointer.title.trim()
    const pointerTarget = resolvePointerSlotTargetType(scene, canvasNode.id, slot)
    entries.push({
      sourcePath: {
        kind: 'pointerChild',
        pointerId: pointer.id,
        slotId: slot.id,
      },
      ritualName: fieldName,
      typeParameter: pointerTarget,
      defaultValue: '',
      exposed: false,
      nameParameter: fieldName,
      iconHint: null,
      iconId: '',
      slotTags: mandatoryPointerSlotTags(pointerTarget),
    })
  }

  return {
    blockType,
    blockName: canvasNode.displayLabel?.trim() || blockTitle,
    entries,
  }
}

function ritualTypeFromNodeDataType(type: NodeParameterDefinition['type']): string {
  switch (type) {
    case 'vector4':
    case 'rgba':
      return 'vec4'
    case 'vector3':
      return 'vec3'
    case 'vector2':
      return 'vec2'
    case 'float':
    case 'f32':
      return 'f32'
    case 'string':
      return 'string'
    default:
      return type
  }
}

export function draftEntryToBlockParameterDef(
  blockName: string,
  entry: BlockInspectorDraftEntry,
  existing: readonly BlockParameterDef[],
): BlockParameterDef {
  const isPointer = isBlockInspectorPointerEntry(entry)
  const iconId = isPointer ? '' : iconIdFromDraft(entry.iconId, entry.iconHint)
  const fieldName = entry.nameParameter.trim() || entry.ritualName
  const pointerSlotType = entry.typeParameter.trim() || fieldName
  const slotRules = isPointer
    ? { inputs: [pointerSlotType] }
    : slotTagsToRules(normalizeDraftEntrySlots(entry))
  return {
    idParameter: nextParameterSequence(blockName, existing),
    nameParameter: isPointer ? fieldName : entry.nameParameter,
    typeParameter: entry.typeParameter,
    defaultValue: entry.defaultValue,
    slotRules,
    iconHint: isPointer ? null : resolveBlockIconHint(iconId),
    iconId: iconId.trim() || undefined,
    sourcePath: entry.sourcePath,
  }
}

export type GenerateBlockResult = {
  structure: BlockStructurePayload
  node: NodeInstance
  childNodePatches: Array<{ nodeId: string; node: NodeInstance }>
  document: BlockGeneratedDocument
}

function unlinkTokenizedParameters(node: NodeInstance, parameterIds: readonly string[]): NodeInstance {
  const blocked = new Set(parameterIds)
  if (blocked.size === 0) {
    return node
  }

  const currentLinks = node.parameter_value_links ?? []
  const filtered = currentLinks.filter(([a, b]) => !blocked.has(a) && !blocked.has(b)) as ParameterValueLinkPair[]
  const normalized = normalizeLinkedParameterPairs(filtered)

  if (normalized.length === currentLinks.length) {
    return node
  }

  return {
    ...node,
    parameter_value_links: normalized.length > 0 ? normalized : undefined,
  }
}

export function generateBlockStructureFromDraft(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  draft: BlockInspectorDraft,
): GenerateBlockResult | null {
  const exposed = draft.entries.filter((entry) => entry.exposed)
  if (exposed.length === 0 && !isEmptyStructBlockSchema(canvasNode.node.schema)) {
    return null
  }

  const typeDef = blockTypeDefinitionById(draft.blockType)

  if (exposed.length === 0) {
    const blocks: BlockGeneratedDocument['blocks'] = {}
    if (typeDef) {
      blocks[typeDef.id] = {
        color: typeDef.color,
        title: typeDef.title,
        slots: typeDef.headerSlots,
      }
    }
    return {
      structure: {
        blockType: draft.blockType,
        blockName: draft.blockName,
        parameters: [],
        identification_codes: [],
      },
      node: canvasNode.node,
      childNodePatches: [],
      document: {
        code: '',
        blocks,
        identification_codes: [],
      },
    }
  }

  const parameters: BlockParameterDef[] = []

  for (const entry of exposed) {
    parameters.push(draftEntryToBlockParameterDef(draft.blockName, entry, parameters))
  }

  const identification_codes = parameters.map((param) =>
    blockTokenFromParameterDef(draft.blockType, draft.blockName, param),
  )

  let nextNode = canvasNode.node
  const childNodePatches: Array<{ nodeId: string; node: NodeInstance }> = []

  for (let index = 0; index < parameters.length; index += 1) {
    const param = parameters[index]
    const token = identification_codes[index]
    if (param.sourcePath.kind === 'parameter') {
      nextNode = writeBlockParameterValue(nextNode, param.sourcePath, token)
      continue
    }

    if (param.sourcePath.kind === 'pointerChild') {
      continue
    }

    const connection = scene.connections.find(
      (entry) =>
        entry.fromNodeId === canvasNode.id &&
        entry.fromInternalStructureId === param.sourcePath.slotId,
    )
    if (connection) {
      const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
      if (child && param.sourcePath.childParameterId) {
        const updatedChild = writeBlockParameterValue(child.node, {
          kind: 'parameter',
          parameterId: param.sourcePath.childParameterId,
        }, token)
        childNodePatches.push({ nodeId: child.id, node: updatedChild })
      }
    }
  }

  const tokenizedParameterIds = parameters
    .filter((param) => param.sourcePath.kind === 'parameter')
    .map((param) => param.sourcePath.parameterId)
  nextNode = unlinkTokenizedParameters(nextNode, tokenizedParameterIds)

  const structure: BlockStructurePayload = {
    blockType: draft.blockType,
    blockName: draft.blockName,
    parameters,
    identification_codes,
  }

  const blocks: BlockGeneratedDocument['blocks'] = {}
  if (typeDef) {
    blocks[typeDef.id] = {
      color: typeDef.color,
      title: typeDef.title,
      slots: typeDef.headerSlots,
    }
  }

  return {
    structure,
    node: nextNode,
    childNodePatches,
    document: {
      code: '',
      blocks,
      identification_codes,
    },
  }
}

export function extractBlockStructureFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): BlockStructurePayload | null {
  const tokens: string[] = []

  for (const parameter of canvasNode.node.schema.parameters) {
    const raw = nodeParameterValue(canvasNode.node, parameter.id)
    if (raw.includes('_blockType&')) {
      tokens.push(raw)
    }
  }

  for (const embed of canvasNode.node.schema.embed ?? []) {
    const slot = embed.slots?.[0] ?? embed.internalStructures[0]
    if (!slot) {
      continue
    }
    const connection = scene.connections.find(
      (entry) => entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === slot.id,
    )
    if (!connection) {
      continue
    }
    const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
    if (!child) {
      continue
    }
    for (const value of child.node.values) {
      if (value.value.includes('_blockType&')) {
        tokens.push(value.value)
      }
    }
  }

  if (tokens.length === 0) {
    return null
  }

  const parsed = tokens.map((token) => parseBlockToken(token)).filter((entry) => entry !== null)
  if (parsed.length === 0) {
    return null
  }

  const first = parsed[0]
  const parameters: BlockParameterDef[] = parsed.map((entry) => {
    const sourceEntry = findSourcePathForToken(scene, canvasNode, entry!.idParameter, entry!.nameParameter)
    return {
      idParameter: entry!.idParameter,
      nameParameter: entry!.nameParameter,
      typeParameter: entry!.typeParameter,
      defaultValue: entry!.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, ''),
      slotRules: entry!.slotRules,
      iconHint: entry!.iconHint ?? null,
      sourcePath: sourceEntry ?? { kind: 'parameter', parameterId: '' },
    }
  })

  return {
    blockType: first!.blockType,
    blockName: first!.blockName,
    parameters,
    identification_codes: tokens,
  }
}

function findSourcePathForToken(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  idParameter: string,
  nameParameter: string,
): BlockParameterSourcePath | null {
  for (const parameter of canvasNode.node.schema.parameters) {
    const raw = nodeParameterValue(canvasNode.node, parameter.id)
    const parsed = parseBlockToken(raw)
    if (parsed?.idParameter === idParameter) {
      return { kind: 'parameter', parameterId: parameter.id }
    }
    if (parameter.name === nameParameter && raw.includes('_blockType&')) {
      return { kind: 'parameter', parameterId: parameter.id }
    }
  }

  for (const embed of canvasNode.node.schema.embed ?? []) {
    const slot = embed.slots?.[0] ?? embed.internalStructures[0]
    if (!slot) {
      continue
    }
    const connection = scene.connections.find(
      (entry) => entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === slot.id,
    )
    if (!connection) {
      continue
    }
    const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
    if (!child) {
      continue
    }
    for (const value of child.node.values) {
      const parsed = parseBlockToken(value.value)
      if (parsed?.idParameter === idParameter || embed.title === nameParameter) {
        return {
          kind: 'embedChild',
          embedId: embed.id,
          slotId: slot.id,
          childParameterId: value.parameterId,
        }
      }
    }
  }

  for (const pointer of canvasNode.node.schema.pointer ?? []) {
    const slots = populatedSlotsForPointer(pointer)
    for (const slot of slots.length > 0 ? slots : pointer.internalStructures) {
      const connection = scene.connections.find(
        (entry) => entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === slot.id,
      )
      if (!connection) {
        continue
      }
      if (slot.name === nameParameter || pointer.title === nameParameter) {
        return {
          kind: 'pointerChild',
          pointerId: pointer.id,
          slotId: slot.id,
        }
      }
    }
  }

  return null
}

export function revertBlockTokensFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: BlockStructurePayload,
): { node: NodeInstance; childNodePatches: Array<{ nodeId: string; node: NodeInstance }> } {
  let nextNode = canvasNode.node
  const childNodePatches: Array<{ nodeId: string; node: NodeInstance }> = []

  for (const param of structure.parameters) {
    const parsed = parseBlockToken(
      structure.identification_codes.find((code) => code.includes(param.idParameter)) ?? '',
    )
    const restored = parsed?.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '') ?? param.defaultValue

    if (param.sourcePath.kind === 'parameter') {
      nextNode = writeBlockParameterValue(nextNode, param.sourcePath, restored)
      continue
    }

    if (param.sourcePath.kind === 'pointerChild') {
      continue
    }

    const connection = scene.connections.find(
      (entry) =>
        entry.fromNodeId === canvasNode.id &&
        entry.fromInternalStructureId === param.sourcePath.slotId,
    )
    if (connection) {
      const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
      if (child) {
        const updated = writeBlockParameterValue(child.node, {
          kind: 'parameter',
          parameterId: param.sourcePath.childParameterId,
        }, restored)
        childNodePatches.push({ nodeId: child.id, node: updated })
      }
    }
  }

  return { node: nextNode, childNodePatches }
}

export function updateBlockParameterTokenValue(
  structure: BlockStructurePayload,
  paramId: string,
  newDefaultValue: string,
): BlockStructurePayload {
  const parameters = structure.parameters.map((param) => {
    if (param.idParameter !== paramId) {
      return param
    }
    return { ...param, defaultValue: newDefaultValue }
  })

  const identification_codes = parameters.map((param) =>
    blockTokenFromParameterDef(structure.blockType, structure.blockName, param),
  )

  return { ...structure, parameters, identification_codes }
}
