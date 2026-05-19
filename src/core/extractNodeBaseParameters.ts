import type {
  EmbedDefinition,
  List2EmbedDefinition,
  List2PointerDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeDataType,
  NodeStructureNomenclature,
  PointerDefinition,
} from './nodeSchema'

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

const STRUCTURAL_ID_MARKERS = [
  '_parameter_',
  '_embed_',
  '_pointer_',
  '_listEmbed_',
  '_listPointer_',
  '_list2Embed_',
  '_list2Pointer_',
] as const

/** Id composto: `collectionType_parameter_paramName` (preserva capitalização). */
export function nodeBaseParameterId(collectionType: string, paramName: string): string {
  return `${collectionType}_parameter_${paramName}`
}

export function hasStructuralIdMarker(id: string): boolean {
  return STRUCTURAL_ID_MARKERS.some((marker) => id.includes(marker))
}

/** Id legado sem marcador estrutural (`_parameter_` / `_embed_` / `_listEmbed_`). */
export function isLegacyParameterId(id: string): boolean {
  const trimmed = id.trim()
  if (!trimmed || hasStructuralIdMarker(trimmed)) {
    return false
  }
  return true
}

/**
 * Converte id legado `{collectionType}_{paramName}` ou slug para id canónico.
 * Se já contém `_parameter_`, devolve inalterado.
 */
export function migrateParameterId(
  collectionType: string,
  legacyId: string,
  paramName?: string,
): string {
  const ct = collectionType.trim()
  const id = legacyId.trim()
  if (!ct || !id) {
    return id
  }
  if (id.includes('_parameter_')) {
    return id
  }
  if (paramName?.trim()) {
    return nodeBaseParameterId(ct, paramName.trim())
  }
  const prefix = `${ct}_`
  if (
    id.startsWith(prefix) &&
    !id.includes('_embed_') &&
    !id.includes('_pointer_') &&
    !id.includes('_listEmbed_') &&
    !id.includes('_listPointer_') &&
    !id.includes('_list2Embed_') &&
    !id.includes('_list2Pointer_')
  ) {
    const suffix = id.slice(prefix.length)
    if (suffix) {
      return nodeBaseParameterId(ct, suffix)
    }
  }
  return id
}

/** Migra id legado inferindo `collectionType` do prefixo antes do primeiro `_`. */
export function migrateParameterIdLoose(legacyId: string): string {
  const id = legacyId.trim()
  if (!id || hasStructuralIdMarker(id)) {
    return id
  }
  const underscore = id.indexOf('_')
  if (underscore > 0) {
    const ct = id.slice(0, underscore)
    const rest = id.slice(underscore + 1)
    if (rest) {
      return nodeBaseParameterId(ct, rest)
    }
  }
  return id
}

/** Id composto: `collectionType_embed_embedTitle`. */
export function nodeBaseEmbedId(collectionType: string, embedTitle: string): string {
  return `${collectionType}_embed_${embedTitle}`
}

/** Id composto: `collectionType_listEmbed_listEmbedTitle` (preserva capitalização). */
export function nodeBaseListEmbedId(collectionType: string, listEmbedTitle: string): string {
  return `${collectionType}_listEmbed_${listEmbedTitle}`
}

/** Id composto: `collectionType_pointer_pointerTitle`. */
export function nodeBasePointerId(collectionType: string, pointerTitle: string): string {
  return `${collectionType}_pointer_${pointerTitle}`
}

/** Id composto: `collectionType_listPointer_listPointerTitle`. */
export function nodeBaseListPointerId(collectionType: string, listPointerTitle: string): string {
  return `${collectionType}_listPointer_${listPointerTitle}`
}

/** Id composto: `collectionType_list2Embed_list2EmbedTitle`. */
export function nodeBaseList2EmbedId(collectionType: string, list2EmbedTitle: string): string {
  return `${collectionType}_list2Embed_${list2EmbedTitle}`
}

/** Id composto: `collectionType_list2Pointer_list2PointerTitle`. */
export function nodeBaseList2PointerId(collectionType: string, list2PointerTitle: string): string {
  return `${collectionType}_list2Pointer_${list2PointerTitle}`
}

export type NodeBaseParameterPayload = {
  id: string
  name: string
  type: string
  defaultValue: string
}

export type NodeBaseEmbedPayload = EmbedDefinition
export type NodeBaseListEmbedPayload = ListEmbedDefinition
export type NodeBasePointerPayload = PointerDefinition
export type NodeBaseListPointerPayload = ListPointerDefinition
export type NodeBaseList2EmbedPayload = List2EmbedDefinition
export type NodeBaseList2PointerPayload = List2PointerDefinition

export function buildNodeBaseEmbedPayload(
  collectionType: string,
  block: EmbedBlockRaw,
): NodeBaseEmbedPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBaseEmbedId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: EmbedDefinition['internalStructures'] = []

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

export function buildNodeBasePointerPayload(
  collectionType: string,
  block: PointerBlockRaw,
): NodeBasePointerPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBasePointerId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: PointerDefinition['internalStructures'] = []

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

export function buildNodeBaseListPointerPayload(
  collectionType: string,
  block: ListPointerBlockRaw,
): NodeBaseListPointerPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBaseListPointerId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: ListPointerDefinition['internalStructures'] = []

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

export function buildNodeBaseList2EmbedPayload(
  collectionType: string,
  block: ListEmbedBlockRaw,
): NodeBaseList2EmbedPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBaseList2EmbedId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: List2EmbedDefinition['internalStructures'] = []

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
    instances: [],
  }
}

export function buildNodeBaseList2PointerPayload(
  collectionType: string,
  block: ListPointerBlockRaw,
): NodeBaseList2PointerPayload | null {
  const title = block.title.trim()
  if (!title) {
    return null
  }

  const id = nodeBaseList2PointerId(collectionType, title)
  const seenSchemaIds = new Set<string>()
  const internalStructures: List2PointerDefinition['internalStructures'] = []

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
    instances: [],
  }
}

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

export type EmbedBlockRaw = {
  id: string
  title: string
  internalStructures: ListEmbedCatalogRefRaw[]
}

export type ListEmbedBlockRaw = EmbedBlockRaw
export type PointerBlockRaw = EmbedBlockRaw
export type ListPointerBlockRaw = EmbedBlockRaw

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
function parseEmbedBlock(value: unknown): EmbedBlockRaw | null {
  return parseListEmbedBlock(value)
}

export function readEmbedBlocksFromSchemaJson(raw: Record<string, unknown>): EmbedBlockRaw[] {
  const fromOfficial: EmbedBlockRaw[] = []
  if (Array.isArray(raw.embed)) {
    for (const item of raw.embed) {
      const block = parseEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
    if (fromOfficial.length > 0) {
      return fromOfficial
    }
  }
  return []
}

export function readPointerBlocksFromSchemaJson(raw: Record<string, unknown>): PointerBlockRaw[] {
  const fromOfficial: PointerBlockRaw[] = []
  if (Array.isArray(raw.pointer)) {
    for (const item of raw.pointer) {
      const block = parseEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
  }
  return fromOfficial
}

export function readListPointerBlocksFromSchemaJson(raw: Record<string, unknown>): ListPointerBlockRaw[] {
  const fromOfficial: ListPointerBlockRaw[] = []
  if (Array.isArray(raw.listPointer)) {
    for (const item of raw.listPointer) {
      const block = parseListEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
    if (fromOfficial.length > 0) {
      return fromOfficial
    }
  }
  return []
}

export function readList2EmbedBlocksFromSchemaJson(raw: Record<string, unknown>): ListEmbedBlockRaw[] {
  const fromOfficial: ListEmbedBlockRaw[] = []
  if (Array.isArray(raw.list2Embed)) {
    for (const item of raw.list2Embed) {
      const block = parseListEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
  }
  return fromOfficial
}

export function readList2PointerBlocksFromSchemaJson(raw: Record<string, unknown>): ListPointerBlockRaw[] {
  const fromOfficial: ListPointerBlockRaw[] = []
  if (Array.isArray(raw.list2Pointer)) {
    for (const item of raw.list2Pointer) {
      const block = parseListEmbedBlock(item)
      if (block) {
        fromOfficial.push(block)
      }
    }
  }
  return fromOfficial
}

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
  embed: []
  pointer: []
  listEmbed: []
  listPointer: []
  list2Embed: []
  list2Pointer: []
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
    embed: [],
    pointer: [],
    listEmbed: [],
    listPointer: [],
    list2Embed: [],
    list2Pointer: [],
    id: collectionType,
    title: collectionType,
    nomenclature: cloneNomenclatureForNodeBase(nomenclature),
    parameters: [],
  }
}
