import type { CanvasNode, CanvasScene } from './canvasScene'
import { getNodeDisplayTitle } from './canvasNodePresentation'
import type {
  GroupGeneratedDocument,
  GroupInspectorDraftEntry,
  GroupParameterDef,
  GroupParameterSourcePath,
  GroupStructurePayload,
} from './groupSchema'
import { resolvePointerSlotTargetType } from './blockParameterClassification'
import { resolveGroupTypeForSchemaTitle, groupTypeDefinitionById } from './groupStructureRegistry'
import { defaultGroupInspectorSlotTags, iconIdFromDraft, isGroupInspectorPointerEntry, mandatoryPointerSlotTags, normalizeDraftEntrySlots, resolveGroupIconHint, slotTagsToRules } from './groupInspectorUi'
import { groupTokenFromParameterDef, parseGroupToken } from './groupTokenParser'
import { populatedSlotsForPointer } from './pointerSlots'
import type { NodeInstance, NodeParameterDefinition } from './nodeSchema'
import { normalizeLinkedParameterPairs } from './linked_parameter_values'
import type { ParameterValueLinkPair } from './link_parameter_value'

function nextParameterSequence(groupName: string, existing: readonly GroupParameterDef[]): string {
  const prefix = groupName.replace(/\s+/g, '')
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

export function resolveGroupParameterValue(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  sourcePath: GroupParameterSourcePath,
): string {
  if (sourcePath.kind === 'parameter') {
    const parameter = canvasNode.node.schema.parameters.find((p) => p.id === sourcePath.parameterId)
    const raw = nodeParameterValue(canvasNode.node, sourcePath.parameterId)
    const parsed = parseGroupToken(raw)
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
  const parsed = parseGroupToken(raw)
  if (parsed) {
    return parsed.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
  }
  return raw
}

export function writeGroupParameterValue(
  node: NodeInstance,
  sourcePath: GroupParameterSourcePath,
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

export function buildGroupInspectorDraftFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): GroupInspectorDraft {
  const schemaTitle = canvasNode.node.schema.title
  const groupTypeDef = resolveGroupTypeForSchemaTitle(schemaTitle)

  const entries: GroupInspectorDraftEntry[] = []

  for (const parameter of canvasNode.node.schema.parameters) {
    entries.push({
      sourcePath: { kind: 'parameter', parameterId: parameter.id },
      ritualName: parameter.name,
      typeParameter: ritualTypeFromNodeDataType(parameter.type),
      defaultValue: resolveGroupParameterValue(scene, canvasNode, {
        kind: 'parameter',
        parameterId: parameter.id,
      }),
      exposed: false,
      nameParameter: parameter.name,
      iconHint: parameter.type === 'string' && parameter.name.toLowerCase().includes('texture') ? 'Img' : null,
      iconId: parameter.type === 'string' && parameter.name.toLowerCase().includes('texture') ? 'Img' : '',
      slotTags: defaultGroupInspectorSlotTags(ritualTypeFromNodeDataType(parameter.type)),
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
    if (!childParam) {
      continue
    }
    entries.push({
      sourcePath: {
        kind: 'embedChild',
        embedId: embed.id,
        slotId: slot.id,
        childParameterId: childParam.id,
      },
      ritualName: embed.title,
      typeParameter: ritualTypeFromNodeDataType(childParam.type),
      defaultValue: childNode
        ? resolveGroupParameterValue(scene, canvasNode, {
            kind: 'embedChild',
            embedId: embed.id,
            slotId: slot.id,
            childParameterId: childParam.id,
          })
        : childParam.defaultValue,
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
      slotTags: defaultGroupInspectorSlotTags(ritualTypeFromNodeDataType(childParam.type)),
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
    groupType: groupTypeDef.id,
    groupName: getNodeDisplayTitle(canvasNode),
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

export function draftEntryToGroupParameterDef(
  groupName: string,
  entry: GroupInspectorDraftEntry,
  existing: readonly GroupParameterDef[],
): GroupParameterDef {
  const isPointer = isGroupInspectorPointerEntry(entry)
  const iconId = isPointer ? '' : iconIdFromDraft(entry.iconId, entry.iconHint)
  const fieldName = entry.nameParameter.trim() || entry.ritualName
  const pointerSlotType = entry.typeParameter.trim() || fieldName
  const slotRules = isPointer
    ? { inputs: [pointerSlotType] }
    : slotTagsToRules(normalizeDraftEntrySlots(entry))
  return {
    idParameter: nextParameterSequence(groupName, existing),
    nameParameter: isPointer ? fieldName : entry.nameParameter,
    typeParameter: entry.typeParameter,
    defaultValue: entry.defaultValue,
    slotRules,
    iconHint: isPointer ? null : resolveGroupIconHint(iconId),
    iconId: iconId.trim() || undefined,
    sourcePath: entry.sourcePath,
  }
}

export type GenerateGroupResult = {
  structure: GroupStructurePayload
  node: NodeInstance
  childNodePatches: Array<{ nodeId: string; node: NodeInstance }>
  document: GroupGeneratedDocument
}

function unlinkTokenizedParameters(node: NodeInstance, parameterIds: readonly string[]): NodeInstance {
  const Grouped = new Set(parameterIds)
  if (Grouped.size === 0) {
    return node
  }

  const currentLinks = node.parameter_value_links ?? []
  const filtered = currentLinks.filter(([a, b]) => !Grouped.has(a) && !Grouped.has(b)) as ParameterValueLinkPair[]
  const normalized = normalizeLinkedParameterPairs(filtered)

  if (normalized.length === currentLinks.length) {
    return node
  }

  return {
    ...node,
    parameter_value_links: normalized.length > 0 ? normalized : undefined,
  }
}

export function generateGroupStructureFromDraft(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  draft: GroupInspectorDraft,
): GenerateGroupResult | null {
  const exposed = draft.entries.filter((entry) => entry.exposed)
  if (exposed.length === 0) {
    return null
  }

  const typeDef = groupTypeDefinitionById(draft.groupType)
  const parameters: GroupParameterDef[] = []

  for (const entry of exposed) {
    parameters.push(draftEntryToGroupParameterDef(draft.groupName, entry, parameters))
  }

  const identification_codes = parameters.map((param) =>
    groupTokenFromParameterDef(draft.groupType, draft.groupName, param),
  )

  let nextNode = canvasNode.node
  const childNodePatches: Array<{ nodeId: string; node: NodeInstance }> = []

  for (let index = 0; index < parameters.length; index += 1) {
    const param = parameters[index]
    const token = identification_codes[index]
    if (param.sourcePath.kind === 'parameter') {
      nextNode = writeGroupParameterValue(nextNode, param.sourcePath, token)
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
        const updatedChild = writeGroupParameterValue(child.node, {
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

  const structure: GroupStructurePayload = {
    groupType: draft.groupType,
    groupName: draft.groupName,
    parameters,
    identification_codes,
  }

  const groups: GroupGeneratedDocument['groups'] = {}
  if (typeDef) {
    groups[typeDef.id] = {
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
      groups,
      identification_codes,
    },
  }
}

export function extractGroupStructureFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): GroupStructurePayload | null {
  const tokens: string[] = []

  for (const parameter of canvasNode.node.schema.parameters) {
    const raw = nodeParameterValue(canvasNode.node, parameter.id)
    if (raw.includes('_groupType&')) {
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
      if (value.value.includes('_groupType&')) {
        tokens.push(value.value)
      }
    }
  }

  if (tokens.length === 0) {
    return null
  }

  const parsed = tokens.map((token) => parseGroupToken(token)).filter((entry) => entry !== null)
  if (parsed.length === 0) {
    return null
  }

  const first = parsed[0]
  const parameters: GroupParameterDef[] = parsed.map((entry) => {
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
    groupType: first!.groupType,
    groupName: first!.groupName,
    parameters,
    identification_codes: tokens,
  }
}

function findSourcePathForToken(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  idParameter: string,
  nameParameter: string,
): GroupParameterSourcePath | null {
  for (const parameter of canvasNode.node.schema.parameters) {
    const raw = nodeParameterValue(canvasNode.node, parameter.id)
    const parsed = parseGroupToken(raw)
    if (parsed?.idParameter === idParameter) {
      return { kind: 'parameter', parameterId: parameter.id }
    }
    if (parameter.name === nameParameter && raw.includes('_groupType&')) {
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
      const parsed = parseGroupToken(value.value)
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

export function revertGroupTokensFromNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: GroupStructurePayload,
): { node: NodeInstance; childNodePatches: Array<{ nodeId: string; node: NodeInstance }> } {
  let nextNode = canvasNode.node
  const childNodePatches: Array<{ nodeId: string; node: NodeInstance }> = []

  for (const param of structure.parameters) {
    const parsed = parseGroupToken(
      structure.identification_codes.find((code) => code.includes(param.idParameter)) ?? '',
    )
    const restored = parsed?.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '') ?? param.defaultValue

    if (param.sourcePath.kind === 'parameter') {
      nextNode = writeGroupParameterValue(nextNode, param.sourcePath, restored)
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
        const updated = writeGroupParameterValue(child.node, {
          kind: 'parameter',
          parameterId: param.sourcePath.childParameterId,
        }, restored)
        childNodePatches.push({ nodeId: child.id, node: updated })
      }
    }
  }

  return { node: nextNode, childNodePatches }
}

export function updateGroupParameterTokenValue(
  structure: GroupStructurePayload,
  paramId: string,
  newDefaultValue: string,
): GroupStructurePayload {
  const parameters = structure.parameters.map((param) => {
    if (param.idParameter !== paramId) {
      return param
    }
    return { ...param, defaultValue: newDefaultValue }
  })

  const identification_codes = parameters.map((param) =>
    groupTokenFromParameterDef(structure.groupType, structure.groupName, param),
  )

  return { ...structure, parameters, identification_codes }
}
