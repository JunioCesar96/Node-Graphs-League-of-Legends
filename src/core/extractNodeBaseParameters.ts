import type { ListEmbedDefinition, NodeDataType, NodeStructureNomenclature } from './nodeSchema'

import { fx_pathHierarchy } from './pathHierarchy'

const NODE_DATA_TYPES: ReadonlySet<string> = new Set<NodeDataType>([
  'keyword',
  'string',
  'comment',
  'property',
  'symbol',
  'integer',
  'i8',
  'u8',
  'i16',
  'u16',
  'i32',
  'u32',
  'i64',
  'u64',
  'f32',
  'float',
  'double',
  'vector2',
  'vector3',
  'vector4',
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
  'rgba',
  'bool',
])

/** Valor default para ficheiros «node base» (spec parametros_nodes.md), por `type` normalizado. */
export function defaultValueForNodeBaseType(typeLower: string): string {
  switch (typeLower) {
    case 'vector2':
      return '0,0'
    case 'vector3':
      return '0,0,0'
    case 'vector4':
      return '0,0,0,0'
    case 'listf32':
    case 'liststring':
    case 'listhash':
    case 'listvector2':
    case 'listvector3':
    case 'listvector4':
      return ''
    case 'rgba':
      return '1, 1, 1, 1'
    case 'float':
    case 'double':
      return '0'
    case 'integer':
    case 'i8':
    case 'u8':
    case 'i16':
    case 'u16':
    case 'i32':
    case 'u32':
    case 'i64':
    case 'u64':
    case 'f32':
      return '0'
    case 'bool':
    case 'boolean':
      return 'false'
    case 'string':
      return ''
    default:
      return ''
  }
}

export function normalizeParameterType(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isKnownStructureParameterType(typeLower: string): boolean {
  return NODE_DATA_TYPES.has(typeLower)
}

/** Id composto: `collectionType_parameterName` (preserva capitalização de `collectionType` e `paramName`). */
export function nodeBaseParameterId(collectionType: string, paramName: string): string {
  return `${collectionType}_${paramName}`
}

/** Id composto: `collectionType_listEmbed_listEmbedTitle` (preserva capitalização). */
export function nodeBaseListEmbedId(collectionType: string, listEmbedTitle: string): string {
  return `${collectionType}_listEmbed_${listEmbedTitle}`
}

export type NodeBaseParameterPayload = {
  id: string
  name: string
  type: string
  defaultValue: string
}

export type NodeBaseListEmbedPayload = ListEmbedDefinition

export function buildNodeBaseListEmbedPayload(
  collectionType: string,
  block: ListEmbedBlockRaw,
): NodeBaseListEmbedPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBaseListEmbedId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: ListEmbedDefinition['internalStructures'] = []

  for (const ref of block.internalStructures) {
    if (seenSchemaIds.has(ref.schemaId)) {
      continue
    }
    seenSchemaIds.add(ref.schemaId)
    const catalogName = ref.name?.trim() || ref.schemaId
    internalStructures.push({
      id: `${id}-catalog-${String(internalStructures.length)}`,
      name: catalogName,
      schemaId: ref.schemaId,
    })
  }

  return {
    id,
    title,
    internalStructures,
  }
}

export function buildNodeBaseParameterPayload(
  collectionType: string,
  paramName: string,
  typeRaw: string,
): NodeBaseParameterPayload | null {
  const name = paramName.trim()
  if (!name) {
    return null
  }

  const typeLower = normalizeParameterType(typeRaw)
  if (!typeLower) {
    return null
  }

  return {
    id: nodeBaseParameterId(collectionType, name),
    name,
    type: typeLower,
    defaultValue: defaultValueForNodeBaseType(typeLower),
  }
}

export type ListEmbedCatalogRefRaw = {
  schemaId: string
  name?: string
}

export type ListEmbedBlockRaw = {
  id: string
  title: string
  internalStructures: ListEmbedCatalogRefRaw[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isListEmbedBlockShape(value: unknown): value is ListEmbedBlockRaw {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.id !== 'string' || typeof value.title !== 'string') {
    return false
  }
  if (!Array.isArray(value.internalStructures)) {
    return false
  }
  return true
}

function parseListEmbedCatalogRefs(internalStructures: unknown[]): ListEmbedCatalogRefRaw[] {
  const refs: ListEmbedCatalogRefRaw[] = []
  for (const item of internalStructures) {
    if (!isRecord(item)) {
      continue
    }
    const schemaId = item.schemaId
    if (typeof schemaId !== 'string' || schemaId.trim() === '') {
      continue
    }
    const name = typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim() : undefined
    refs.push({ schemaId: schemaId.trim(), ...(name ? { name } : {}) })
  }
  return refs
}

function parseListEmbedBlock(value: unknown): ListEmbedBlockRaw | null {
  if (!isListEmbedBlockShape(value)) {
    return null
  }
  return {
    id: value.id.trim(),
    title: value.title.trim(),
    internalStructures: parseListEmbedCatalogRefs(value.internalStructures),
  }
}

/**
 * Lê blocos LIST_EMBED do JSON de instância.
 * Aceita `listEmbed` oficial ou blocos com a mesma forma noutra chave top-level (export corrompido).
 */
export function readListEmbedBlocksFromSchemaJson(raw: Record<string, unknown>): ListEmbedBlockRaw[] {
  const fromOfficial: ListEmbedBlockRaw[] = []
  if (Array.isArray(raw.listEmbed)) {
    for (const item of raw.listEmbed) {
      const block = parseListEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
    if (fromOfficial.length > 0) {
      return fromOfficial
    }
  }

  const fallback: ListEmbedBlockRaw[] = []
  for (const value of Object.values(raw)) {
    if (!Array.isArray(value)) {
      continue
    }
    for (const item of value) {
      const block = parseListEmbedBlock(item)
      if (block) {
        fallback.push(block)
      }
    }
  }
  return fallback
}

/** `schemaId` únicos referenciados no catálogo LIST_EMBED. */
export function collectSchemaIdsFromListEmbedBlocks(blocks: readonly ListEmbedBlockRaw[]): string[] {
  const ids = new Set<string>()
  for (const block of blocks) {
    for (const ref of block.internalStructures) {
      ids.add(ref.schemaId)
    }
  }
  return [...ids]
}

export function collectSchemaIdsFromListEmbedJson(raw: Record<string, unknown>): string[] {
  return collectSchemaIdsFromListEmbedBlocks(readListEmbedBlocksFromSchemaJson(raw))
}

/** Corpo JSON mínimo do nó base por `collectionType` (node_base.md). */
export type NodeBaseSchemaBodyJson = {
  internalStructures: []
  listEmbed: []
  id: string
  title: string
  nomenclature: NodeStructureNomenclature
  parameters: []
}

/** Copia `nomenclature` para JSON de nó base, incluindo `pathHierarchy` / `pathHierarchySteps`. */
export function cloneNomenclatureForNodeBase(nomenclature: NodeStructureNomenclature): NodeStructureNomenclature {
  const out: NodeStructureNomenclature = {
    group: nomenclature.group,
    collection: nomenclature.collection,
    collectionType: nomenclature.collectionType,
  }
  const pathHierarchyRaw =
    typeof nomenclature.pathHierarchy === 'string' ? nomenclature.pathHierarchy.trim() : ''
  if (pathHierarchyRaw.length > 0) {
    out.pathHierarchy = pathHierarchyRaw
  }
  if (nomenclature.pathHierarchySteps && nomenclature.pathHierarchySteps.length > 0) {
    out.pathHierarchySteps = fx_pathHierarchy(nomenclature.pathHierarchySteps)
  }
  return out
}

export function buildNodeBaseSchemaBody(
  collectionType: string,
  nomenclature: NodeStructureNomenclature,
): NodeBaseSchemaBodyJson {
  return {
    internalStructures: [],
    listEmbed: [],
    id: collectionType,
    title: collectionType,
    nomenclature: cloneNomenclatureForNodeBase(nomenclature),
    parameters: [],
  }
}
