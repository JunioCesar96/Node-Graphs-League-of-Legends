/**
 * Modelo de parâmetros derivado exclusivamente do código ritual (Class Group parseado).
 *
 * — **simples**: valor escalar sem classe nomeada (`pass: i16 = 30`, `constantValue: vec3 = { 0, 1, 0 }`).
 *   `slots.out` = tipo ritual (`i16`, `vec3`, `f32`, …).
 *
 * — **composto**: múltiplos valores em `{ }` sem tipo de bloco (`particleLinger: option[f32] = { 2 }`,
 *   `times: list[f32] = { 0 1 }`). `slots.out` = tipo do elemento (`f32`, `vec3`, …).
 *
 * — **classe**: referência a outro bloco (`dynamics: pointer = VfxAnimatedColorVariableData {}`).
 *   Toda classe é um bloco; `slots.out` = nome da classe (`VfxAnimatedColorVariableData`).
 */

import type {
  BlockParameterJsonDocument,
  BlockParameterJsonDocumentList,
} from './blockParameterJson'
import { buildBlockParameterDocumentId } from './blockParameterJson'
import {
  listElementSlotType,
  optionElementSlotType,
  parseListItems,
  parseOptionItem,
} from './blockParameterClassification'
import { blockParameterSourceId } from './blockParameterSynthesis'
import type { MutableClassGroupSchema } from './classGroupRitualStackParser'
import { buildMapParameterJsonDocument } from './blockParameterMapDocument'
import type { NodeDataType } from './nodeSchema'

export type RitualParameterCategory = 'simple' | 'compound' | 'class'

const COMPOUND_NODE_DATA_TYPES = new Set<NodeDataType>([
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
  'optionF32',
  'optionString',
  'optionVector3',
  'mapHashPointer',
  'mapHashEmbed',
  'mapU64Pointer',
])

export function classifyRitualParameterFromNodeData(type: NodeDataType): RitualParameterCategory {
  if (COMPOUND_NODE_DATA_TYPES.has(type)) {
    return 'compound'
  }
  return 'simple'
}

/** Tipo ritual para slots de parâmetros simples (in/out iguais). */
export function ritualScalarSlotType(nodeType: NodeDataType | string): string {
  switch (nodeType) {
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
    case 'bool':
      return 'bool'
    case 'flag':
      return 'flag'
    default:
      return String(nodeType).trim() || 'string'
  }
}

/** `slots.out` para parâmetros compostos (list/option). */
export function ritualCompoundOutSlot(nodeType: NodeDataType): string {
  if (
    nodeType === 'optionF32' ||
    nodeType === 'optionString' ||
    nodeType === 'optionVector3'
  ) {
    return optionElementSlotType(nodeType)
  }
  if (
    nodeType === 'listF32' ||
    nodeType === 'listString' ||
    nodeType === 'listHash' ||
    nodeType === 'listVector2' ||
    nodeType === 'listVector3' ||
    nodeType === 'listVector4'
  ) {
    return listElementSlotType(nodeType)
  }
  if (nodeType === 'mapHashPointer' || nodeType === 'mapHashEmbed' || nodeType === 'mapU64Pointer') {
    return nodeType
  }
  return ritualScalarSlotType(nodeType)
}

/** `slots.out` para parâmetros de classe (embed/pointer) — nome do bloco filho. */
export function ritualClassOutSlots(className: string): string[] {
  const blockClass = className.trim()
  return blockClass ? [blockClass] : []
}

function structuralTargetName(block: {
  internalStructures: Array<{ name: string; schemaId: string }>
  slots?: Array<{ name: string; schemaId: string }>
}): string {
  return block.internalStructures[0]?.name.trim() || block.slots?.[0]?.name.trim() || ''
}

export type RitualParameterBuildContext = {
  blockName: string
  nodeId: string
  schema: MutableClassGroupSchema
}

function buildSimpleParameterDocument(
  ctx: RitualParameterBuildContext,
  parameterName: string,
  nodeType: NodeDataType,
  value: string,
): BlockParameterJsonDocument {
  const name = parameterName.trim()
  const slotType = ritualScalarSlotType(nodeType)
  return {
    id: buildBlockParameterDocumentId(name, name),
    block: ctx.blockName,
    parameterName: name,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(ctx.nodeId, name, 'scalar'),
    },
    type: slotType,
    value,
    slots: { in: [slotType], out: [slotType] },
  }
}

function buildClassPointerDocument(
  ctx: RitualParameterBuildContext,
  parameterName: string,
  className: string,
  options?: { list?: boolean },
): BlockParameterJsonDocument {
  const name = parameterName.trim()
  const pointer = className.trim()
  return {
    id: buildBlockParameterDocumentId(name, `${name}_pointer_${pointer}`),
    block: ctx.blockName,
    parameterName: name,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(ctx.nodeId, name, 'pointer'),
    },
    type: 'pointer',
    ...(options?.list ? { list: true } : {}),
    pointer,
    slots: { out: ritualClassOutSlots(pointer) },
  }
}

function buildClassEmbedDocument(
  ctx: RitualParameterBuildContext,
  parameterName: string,
  className: string,
  options?: { list?: boolean },
): BlockParameterJsonDocument {
  const name = parameterName.trim()
  const embed = className.trim()
  return {
    id: buildBlockParameterDocumentId(name, `${name}_embed_${embed}`),
    block: ctx.blockName,
    parameterName: name,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(ctx.nodeId, name, 'pointer'),
    },
    type: 'embed',
    ...(options?.list ? { list: true } : {}),
    embed,
    slots: { out: ritualClassOutSlots(embed) },
  }
}

function buildCompoundMapDocument(
  ctx: RitualParameterBuildContext,
  parameterName: string,
  mapKind: 'mapHashPointer' | 'mapHashEmbed' | 'mapU64Pointer',
  rawValue: string,
): BlockParameterJsonDocument {
  return buildMapParameterJsonDocument({
    blockName: ctx.blockName,
    parameterName,
    parameterId: blockParameterSourceId(ctx.nodeId, parameterName, 'scalar'),
    mapKind,
    rawValue,
  })
}

function buildCompoundListOrOptionDocument(
  ctx: RitualParameterBuildContext,
  parameterName: string,
  nodeType: NodeDataType,
  rawValue: string,
): BlockParameterJsonDocument {
  const outSlot = ritualCompoundOutSlot(nodeType)

  if (
    nodeType === 'optionF32' ||
    nodeType === 'optionString' ||
    nodeType === 'optionVector3'
  ) {
    return {
      id: buildBlockParameterDocumentId(parameterName, `${parameterName}_${nodeType}`),
      block: ctx.blockName,
      parameterName,
      name: parameterName,
      source: {
        kind: 'parameter',
        parameterId: blockParameterSourceId(ctx.nodeId, parameterName, 'scalar'),
      },
      type: nodeType,
      item: parseOptionItem(nodeType, rawValue),
      slots: { out: [outSlot] },
    }
  }

  const listType = nodeType as BlockParameterJsonDocumentList['type']
  return {
    id: buildBlockParameterDocumentId(parameterName, `${parameterName}_${nodeType}`),
    block: ctx.blockName,
    parameterName,
    name: parameterName,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(ctx.nodeId, parameterName, 'scalar'),
    },
    type: listType,
    items: parseListItems(nodeType, rawValue),
    slots: { out: [outSlot] },
  }
}

/**
 * Gera documentos JSON de parâmetro a partir do schema ritual parseado (sem nodeStructures).
 */
export function buildParameterDocumentsFromRitualSchema(
  ctx: RitualParameterBuildContext,
): BlockParameterJsonDocument[] {
  const documents: BlockParameterJsonDocument[] = []
  const seen = new Set<string>()

  const push = (doc: BlockParameterJsonDocument | null) => {
    if (!doc) {
      return
    }
    const key = `${doc.block}::${doc.parameterName}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    documents.push(doc)
  }

  for (const parameter of ctx.schema.parameters) {
    const parameterName = parameter.name.trim()
    if (!parameterName) {
      continue
    }
    const nodeType = parameter.type
    const category = classifyRitualParameterFromNodeData(nodeType)

    if (category === 'compound') {
      if (
        nodeType === 'mapHashPointer' ||
        nodeType === 'mapHashEmbed' ||
        nodeType === 'mapU64Pointer'
      ) {
        push(buildCompoundMapDocument(ctx, parameterName, nodeType, parameter.defaultValue))
      } else {
        push(buildCompoundListOrOptionDocument(ctx, parameterName, nodeType, parameter.defaultValue))
      }
      continue
    }

    push(buildSimpleParameterDocument(ctx, parameterName, nodeType, parameter.defaultValue))
  }

  for (const embed of ctx.schema.embed ?? []) {
    const fieldName = embed.title.trim()
    const className = structuralTargetName(embed)
    if (fieldName && className) {
      push(buildClassEmbedDocument(ctx, fieldName, className))
    }
  }

  for (const pointer of ctx.schema.pointer ?? []) {
    const fieldName = pointer.title.trim()
    const className = structuralTargetName(pointer)
    if (fieldName && className) {
      push(buildClassPointerDocument(ctx, fieldName, className))
    }
  }

  for (const listEmbed of ctx.schema.listEmbed ?? []) {
    const fieldName = (listEmbed.parameterName ?? listEmbed.title).trim()
    const className = structuralTargetName(listEmbed)
    if (fieldName && className) {
      push(buildClassEmbedDocument(ctx, fieldName, className, { list: true }))
    }
  }

  for (const listPointer of ctx.schema.listPointer ?? []) {
    const fieldName = listPointer.title.trim()
    const className = structuralTargetName(listPointer)
    if (fieldName && className) {
      push(buildClassPointerDocument(ctx, fieldName, className, { list: true }))
    }
  }

  return documents
}
