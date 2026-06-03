import type { CanvasNode, CanvasScene } from './canvasScene'
import type { BlockInspectorDraft, BlockInspectorDraftEntry } from './blockSchema'
import { normalizeDraftEntrySlots } from './blockInspectorUi'
import {
  buildComplexBlockParameterDocumentId,
  classificationKindSegment,
  classifyBlockParameterEntry,
  listElementSlotType,
  optionElementSlotType,
  parseListItems,
  parseOptionItem,
  resolveEmbedTarget,
  resolveMapEntries,
  resolvePointerTarget,
  resolveTypeValueForId,
} from './blockParameterClassification'
import { buildTemplatedParameterId, resolveConcreteParameterId } from './blockParameterIdTemplate'
import type { NodeSchemaDefinition } from './nodeSchema'

export type BlockParameterJsonSource = {
  kind: 'parameter'
  parameterId: string
}

export type BlockParameterJsonSlotsSimple = {
  in: string[]
  out: string[]
}

export type BlockParameterJsonSlotsOutOnly = {
  out: string[]
}

export type BlockParameterJsonDocumentBase = {
  id: string
  block: string
  parameterName: string
  name: string
  source: BlockParameterJsonSource
}

export type BlockParameterJsonDocumentSimple = BlockParameterJsonDocumentBase & {
  type: string
  value: string
  slots: BlockParameterJsonSlotsSimple
}

export type BlockParameterJsonDocumentEmbed = BlockParameterJsonDocumentBase & {
  type: 'embed'
  embed: string
  slots: BlockParameterJsonSlotsOutOnly
}

export type BlockParameterJsonDocumentPointer = BlockParameterJsonDocumentBase & {
  type: 'pointer'
  pointer: string
  slots: BlockParameterJsonSlotsOutOnly
}

export type BlockParameterJsonDocumentMap = BlockParameterJsonDocumentBase & {
  type: 'mapHashPointer' | 'mapHashEmbed' | 'mapU64Pointer'
  mapKind: 'mapHashPointer' | 'mapHashEmbed' | 'mapU64Pointer'
  entries: Array<{ key: string; target: string }>
  slots: BlockParameterJsonSlotsOutOnly
}

export type BlockParameterJsonDocumentList = BlockParameterJsonDocumentBase & {
  type:
    | 'listF32'
    | 'listString'
    | 'listHash'
    | 'listVector2'
    | 'listVector3'
    | 'listVector4'
  items: string[]
  slots: BlockParameterJsonSlotsOutOnly
}

export type BlockParameterJsonDocumentOption = BlockParameterJsonDocumentBase & {
  type: 'optionF32' | 'optionString' | 'optionVector3'
  item: string | null
  slots: BlockParameterJsonSlotsOutOnly
}

export type BlockParameterJsonDocument =
  | BlockParameterJsonDocumentSimple
  | BlockParameterJsonDocumentEmbed
  | BlockParameterJsonDocumentPointer
  | BlockParameterJsonDocumentMap
  | BlockParameterJsonDocumentList
  | BlockParameterJsonDocumentOption

export type BlockParameterJsonSlots = BlockParameterJsonSlotsSimple

export type BuildBlockParameterJsonResult =
  | { ok: true; document: BlockParameterJsonDocument }
  | { ok: false; error: string }

export function isSimpleBlockParameterDocument(
  doc: BlockParameterJsonDocument,
): doc is BlockParameterJsonDocumentSimple {
  return 'value' in doc
}

/** Separa camelCase/PascalCase em palavras com espaço (ex.: blendMode → blend Mode). */
export function humanizeParameterDisplayName(parameterName: string): string {
  const trimmed = parameterName.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}

export function resolveBlockParameterDisplayName(entry: BlockInspectorDraftEntry): string {
  const fromField = entry.nameParameter.trim()
  if (fromField) {
    return fromField
  }
  return humanizeParameterDisplayName(entry.ritualName)
}

export function buildBlockParameterDocumentId(parameterName: string, displayName: string): string {
  return `${parameterName.trim()}_${displayName.trim()}`
}

export function buildBlockParameterSourceId(
  entry: BlockInspectorDraftEntry,
  blockType: string,
  schemaId = '',
): string {
  const parameterName = entry.ritualName.trim()
  const rawId =
    entry.sourcePath.kind === 'parameter' ? entry.sourcePath.parameterId.trim() : ''
  const realId = resolveConcreteParameterId(rawId, parameterName, schemaId)

  return buildTemplatedParameterId(blockType, parameterName, realId)
}

export function slotsFromDraftEntry(entry: BlockInspectorDraftEntry): BlockParameterJsonSlotsSimple {
  const tags = normalizeDraftEntrySlots(entry)
  const active = tags.filter((tag) => tag.active)
  const inputs = active.filter((tag) => tag.direction === 'input').map((tag) => tag.type)
  const outputs = active.filter((tag) => tag.direction === 'output').map((tag) => tag.type)

  if (inputs.length === 0 && outputs.length === 0) {
    const fallback = entry.typeParameter.trim() || 'string'
    return { in: [fallback], out: [fallback] }
  }

  return { in: inputs, out: outputs }
}

import { sanitizeBlockParameterFileStem } from './blockParameterFileStem'

export {
  sanitizeBlockParameterFileStem,
  sanitizeBlockStructureFolderName,
} from './blockParameterFileStem'

function parameterValueForEntry(canvasNode: CanvasNode, entry: BlockInspectorDraftEntry): string {
  if (entry.sourcePath.kind !== 'parameter') {
    return entry.defaultValue
  }
  const parameter = canvasNode.node.schema.parameters.find(
    (item) => item.id === entry.sourcePath.parameterId,
  )
  if (!parameter) {
    return entry.defaultValue
  }
  return (
    canvasNode.node.values.find((item) => item.parameterId === parameter.id)?.value ??
    parameter.defaultValue
  )
}

function buildDocumentBase(
  entry: BlockInspectorDraftEntry,
  draft: BlockInspectorDraft,
  id: string,
  parameterName: string,
  name: string,
  schemaId: string,
): BlockParameterJsonDocumentBase | BuildBlockParameterJsonResult {
  const block = draft.blockType.trim()
  if (!block) {
    return { ok: false, error: 'blockType em falta no rascunho' }
  }

  return {
    id,
    block,
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: buildBlockParameterSourceId(entry, block, schemaId),
    },
  }
}

function buildComplexDocument(
  entry: BlockInspectorDraftEntry,
  draft: BlockInspectorDraft,
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameterName: string,
  name: string,
  id: string,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): BuildBlockParameterJsonResult {
  const classification = classifyBlockParameterEntry(entry, canvasNode)
  const schemaId = canvasNode.node.schema.id.trim()
  const base = buildDocumentBase(entry, draft, id, parameterName, name, schemaId)
  if ('ok' in base) {
    return base
  }

  switch (classification.kind) {
    case 'embed': {
      const embed = resolveEmbedTarget(scene, canvasNode, entry, schemaRegistry)
      if (!embed) {
        return { ok: false, error: 'embed target em falta' }
      }
      return {
        ok: true,
        document: {
          ...base,
          type: 'embed',
          embed,
          slots: { out: [embed] },
        },
      }
    }
    case 'pointer': {
      const pointer = resolvePointerTarget(scene, canvasNode, entry, schemaRegistry)
      if (!pointer) {
        return { ok: false, error: 'pointer target em falta' }
      }
      return {
        ok: true,
        document: {
          ...base,
          type: 'pointer',
          pointer,
          slots: { out: [pointer] },
        },
      }
    }
    case 'map': {
      const mapKind = classification.mapKind
      if (!mapKind) {
        return { ok: false, error: 'mapKind em falta' }
      }
      const entries = resolveMapEntries(scene, canvasNode, entry, mapKind)
      const targets = [...new Set(entries.map((item) => item.target.trim()).filter(Boolean))]
      return {
        ok: true,
        document: {
          ...base,
          type: mapKind,
          mapKind,
          entries,
          slots: { out: targets.length > 0 ? targets : [mapKind] },
        },
      }
    }
    case 'list': {
      const nodeDataType = classification.nodeDataType
      if (!nodeDataType) {
        return { ok: false, error: 'list type em falta' }
      }
      const items = parseListItems(nodeDataType, parameterValueForEntry(canvasNode, entry))
      return {
        ok: true,
        document: {
          ...base,
          type: nodeDataType,
          items,
          slots: { out: [listElementSlotType(nodeDataType)] },
        },
      }
    }
    case 'option': {
      const nodeDataType = classification.nodeDataType
      if (!nodeDataType) {
        return { ok: false, error: 'option type em falta' }
      }
      const item = parseOptionItem(nodeDataType, parameterValueForEntry(canvasNode, entry))
      return {
        ok: true,
        document: {
          ...base,
          type: nodeDataType,
          item,
          slots: { out: [optionElementSlotType(nodeDataType)] },
        },
      }
    }
    default:
      return { ok: false, error: 'classificação complexa inválida' }
  }
}

export function buildBlockParameterJsonDocument(
  entry: BlockInspectorDraftEntry,
  draft: BlockInspectorDraft,
  scene: CanvasScene,
  canvasNode: CanvasNode,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): BuildBlockParameterJsonResult {
  const parameterName = entry.ritualName.trim()
  if (!parameterName) {
    return { ok: false, error: 'parameterName em falta' }
  }

  const name = resolveBlockParameterDisplayName(entry)
  if (!name) {
    return { ok: false, error: 'name em falta' }
  }
  if (name.includes('_')) {
    return { ok: false, error: `name não pode conter "_": ${name}` }
  }

  const classification = classifyBlockParameterEntry(entry, canvasNode)
  const id =
    classification.kind === 'simple'
      ? buildBlockParameterDocumentId(parameterName, name)
      : buildComplexBlockParameterDocumentId(
          parameterName,
          name,
          classificationKindSegment(classification),
          resolveTypeValueForId(classification, entry, scene, canvasNode, schemaRegistry),
        )

  const stem = sanitizeBlockParameterFileStem(id)
  if (!stem) {
    return { ok: false, error: `id inválido para ficheiro: ${id}` }
  }

  if (classification.kind !== 'simple') {
    return buildComplexDocument(
      entry,
      draft,
      scene,
      canvasNode,
      parameterName,
      name,
      id,
      schemaRegistry,
    )
  }

  const base = buildDocumentBase(
    entry,
    draft,
    id,
    parameterName,
    name,
    canvasNode.node.schema.id.trim(),
  )
  if ('ok' in base) {
    return base
  }

  return {
    ok: true,
    document: {
      ...base,
      type: entry.typeParameter.trim() || 'string',
      value: entry.defaultValue,
      slots: slotsFromDraftEntry(entry),
    },
  }
}

export function buildBlockParameterJsonDocuments(
  entries: readonly BlockInspectorDraftEntry[],
  draft: BlockInspectorDraft,
  scene: CanvasScene,
  canvasNode: CanvasNode,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): { documents: BlockParameterJsonDocument[]; errors: string[] } {
  const documents: BlockParameterJsonDocument[] = []
  const errors: string[] = []

  for (const entry of entries) {
    const result = buildBlockParameterJsonDocument(
      entry,
      draft,
      scene,
      canvasNode,
      schemaRegistry,
    )
    if (result.ok) {
      documents.push(result.document)
    } else {
      const label = entry.ritualName || entry.nameParameter || '?'
      errors.push(`${label}: ${result.error}`)
    }
  }

  return { documents, errors }
}
