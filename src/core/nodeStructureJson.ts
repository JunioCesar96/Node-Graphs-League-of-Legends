import type {
  EmbedDefinition,
  InternalStructureDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeDataType,
  NodeParameterDefinition,
  NodeSchemaDefinition,
  NodeStructureNomenclature,
  NomenclaturePathSegment,
  PointerDefinition,
} from './nodeSchema'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Índice depois de `#` em labels tipo `#2 Entidades` (classificação nominal). */
export function nomenclatureGroupNumberFromLabel(group: string | undefined): number | null {
  if (typeof group !== 'string') {
    return null
  }
  const m = /^#\s*(\d+)/.exec(group.trim())
  if (!m) {
    return null
  }
  const n = Number.parseInt(m[1]!, 10)
  return Number.isFinite(n) ? n : null
}

/** Stub JSON de parâmetro na pasta do nó base (não confundir com embed/listEmbed). */
export function isParameterStubShape(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  if ('title' in raw || 'internalStructures' in raw || 'embed' in raw || 'listEmbed' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  const name = typeof raw.name === 'string' ? raw.name : ''
  const typ = typeof raw.type === 'string' ? raw.type : ''
  const defaultValue = typeof raw.defaultValue === 'string' ? raw.defaultValue : null
  if (!id || !name || defaultValue === null || !typ || !NODE_DATA_TYPES.has(typ)) {
    return false
  }
  if (
    id.includes('_embed_') ||
    id.includes('_pointer_') ||
    id.includes('_listEmbed_') ||
    id.includes('_listPointer_')
  ) {
    return false
  }
  return true
}

export function nodeParameterDefinitionFromJsonStub(raw: unknown): NodeParameterDefinition | null {
  if (!isParameterStubShape(raw)) {
    return null
  }
  return parseParameter(raw)
}

function parseParameter(raw: unknown): NodeParameterDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const defaultValue =
    typeof raw.defaultValue === 'string' ? raw.defaultValue : null
  const typ = typeof raw.type === 'string' ? raw.type : null

  if (!id || !name || defaultValue === null || !typ || !NODE_DATA_TYPES.has(typ)) {
    return null
  }

  return {
    id,
    name,
    type: typ as NodeDataType,
    defaultValue,
  }
}

function parsePathHierarchyStepsArray(raw: unknown): NomenclaturePathSegment[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const out: NomenclaturePathSegment[] = []
  for (const item of raw) {
    if (!isRecord(item)) {
      return undefined
    }
    const type = typeof item.type === 'string' ? item.type.trim() : ''
    if (!type) {
      return undefined
    }
    const id = typeof item.id === 'string' ? item.id : ''
    out.push({ id, type })
  }
  return out.length > 0 ? out : undefined
}

/**
 * Lê `nomenclature` de um fragmento JSON.
 * Só `collectionType` é obrigatório (não vazio após trim).
 * `group` e `collection` podem ser `""` até o analisador de `.bin` (nomecratura.md) os preencher.
 */
export function parseNomenclatureFromStructureJson(raw: unknown): NodeStructureNomenclature | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const collectionTypeRaw = typeof raw.collectionType === 'string' ? raw.collectionType.trim() : ''
  if (!collectionTypeRaw) {
    return undefined
  }
  const group = typeof raw.group === 'string' ? raw.group : ''
  const collection = typeof raw.collection === 'string' ? raw.collection : ''
  const pathHierarchyRaw = typeof raw.pathHierarchy === 'string' ? raw.pathHierarchy.trim() : ''

  let pathHierarchySteps =
    parsePathHierarchyStepsArray(raw.pathHierarchySteps) ??
    (Array.isArray(raw.pathHierarchy) ? parsePathHierarchyStepsArray(raw.pathHierarchy) : undefined)

  const out: NodeStructureNomenclature = {
    group,
    collection,
    collectionType: collectionTypeRaw,
  }
  if (pathHierarchyRaw.length > 0) {
    out.pathHierarchy = pathHierarchyRaw
  }
  if (pathHierarchySteps) {
    out.pathHierarchySteps = pathHierarchySteps
  }

  return out
}

function parseNomenclature(raw: unknown): NodeStructureNomenclature | undefined {
  return parseNomenclatureFromStructureJson(raw)
}

function parseInternalStructure(raw: unknown): InternalStructureDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const schemaId = typeof raw.schemaId === 'string' ? raw.schemaId : null

  if (!id || !name || !schemaId) {
    return null
  }

  return { id, name, schemaId }
}

function readInternalStructuresArray(raw: Record<string, unknown>): unknown[] | null {
  if (Array.isArray(raw.internalStructures)) {
    return raw.internalStructures
  }
  if (Array.isArray(raw.entities)) {
    return raw.entities
  }
  return null
}

function parseInternalStructuresList(raw: unknown): InternalStructureDefinition[] | null {
  if (!Array.isArray(raw)) {
    return null
  }
  const out: InternalStructureDefinition[] = []
  for (const entry of raw) {
    const s = parseInternalStructure(entry)
    if (!s) {
      return null
    }
    out.push(s)
  }
  return out
}

/** Stub JSON de EMBED (`{collectionType}_embed_{title}.json`). */
export function isEmbedStubShape(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  if ('type' in raw && 'defaultValue' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id.includes('_embed_') || id.includes('_listEmbed_')) {
    return false
  }
  return typeof raw.title === 'string' && Array.isArray(raw.internalStructures)
}

/** Stub JSON de LIST_EMBED (`{collectionType}_listEmbed_{title}.json`). */
export function isListEmbedStubShape(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  if ('type' in raw && 'defaultValue' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id.includes('_listEmbed_')) {
    return false
  }
  return typeof raw.title === 'string' && Array.isArray(raw.internalStructures)
}

/** Stub individual de EMBED (`{collectionType}_embed_{title}.json`). */
export function embedDefinitionFromJsonStub(raw: unknown): EmbedDefinition | null {
  if (!isEmbedStubShape(raw)) {
    return null
  }
  return parseEmbed(raw)
}

/** Stub individual de LIST_EMBED na pasta do nó base (`{collectionType}_listEmbed_{title}.json`). */
export function listEmbedDefinitionFromJsonStub(raw: unknown): ListEmbedDefinition | null {
  if (!isListEmbedStubShape(raw)) {
    return null
  }
  return parseListEmbed(raw)
}

/** Stub JSON de POINTER (`{collectionType}_pointer_{title}.json`). */
export function isPointerStubShape(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  if ('type' in raw && 'defaultValue' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id.includes('_pointer_') || id.includes('_listPointer_')) {
    return false
  }
  return typeof raw.title === 'string' && Array.isArray(raw.internalStructures)
}

/** Stub JSON de LIST_POINTER (`{collectionType}_listPointer_{title}.json`). */
export function isListPointerStubShape(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  if ('type' in raw && 'defaultValue' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id.includes('_listPointer_')) {
    return false
  }
  return typeof raw.title === 'string' && Array.isArray(raw.internalStructures)
}

export function pointerDefinitionFromJsonStub(raw: unknown): PointerDefinition | null {
  if (!isPointerStubShape(raw)) {
    return null
  }
  return parsePointer(raw)
}

export function listPointerDefinitionFromJsonStub(raw: unknown): ListPointerDefinition | null {
  if (!isListPointerStubShape(raw)) {
    return null
  }
  return parseListPointer(raw)
}

function parseEmbed(raw: unknown): EmbedDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const title = typeof raw.title === 'string' ? raw.title : null
  if (!id || !title) {
    return null
  }
  const catalog = parseInternalStructuresList(raw.internalStructures)
  if (!catalog) {
    return null
  }
  const result: EmbedDefinition = { id, title, internalStructures: catalog }
  if ('slots' in raw && raw.slots !== undefined) {
    const slots = parseInternalStructuresList(raw.slots)
    if (!slots) {
      return null
    }
    if (slots.length > 0) {
      result.slots = slots.slice(0, 1)
    }
  }
  return result
}

function parseEmbedArray(raw: unknown): EmbedDefinition[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }
  const out: EmbedDefinition[] = []
  for (const entry of raw) {
    const block = parseEmbed(entry)
    if (!block) {
      return null
    }
    out.push(block)
  }
  return out
}

function parseListEmbed(raw: unknown): ListEmbedDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const title = typeof raw.title === 'string' ? raw.title : null
  if (!id || !title) {
    return null
  }

  const catalog = parseInternalStructuresList(raw.internalStructures)
  if (!catalog) {
    return null
  }

  const result: ListEmbedDefinition = {
    id,
    title,
    internalStructures: catalog,
  }

  if ('slots' in raw && raw.slots !== undefined) {
    const slots = parseInternalStructuresList(raw.slots)
    if (!slots) {
      return null
    }
    if (slots.length > 0) {
      result.slots = slots
    }
  }

  return result
}

function parseListEmbedArray(raw: unknown): ListEmbedDefinition[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }
  const out: ListEmbedDefinition[] = []
  for (const entry of raw) {
    const block = parseListEmbed(entry)
    if (!block) {
      return null
    }
    out.push(block)
  }
  return out
}

function parsePointer(raw: unknown): PointerDefinition | null {
  return parseEmbed(raw)
}

function parsePointerArray(raw: unknown): PointerDefinition[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }
  const out: PointerDefinition[] = []
  for (const entry of raw) {
    const block = parsePointer(entry)
    if (!block) {
      return null
    }
    out.push(block)
  }
  return out
}

function parseListPointer(raw: unknown): ListPointerDefinition | null {
  return parseListEmbed(raw)
}

function parseListPointerArray(raw: unknown): ListPointerDefinition[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }
  const out: ListPointerDefinition[] = []
  for (const entry of raw) {
    const block = parseListPointer(entry)
    if (!block) {
      return null
    }
    out.push(block)
  }
  return out
}

function parseSchemaRequiredParameterIds(
  raw: unknown,
  parameterIds: Set<string>,
): string[] | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const out: string[] = []

  for (const item of raw) {
    if (typeof item !== 'string' || !parameterIds.has(item)) {
      continue
    }

    if (!out.includes(item)) {
      out.push(item)
    }
  }

  return out
}

function parseSchemaLinkedParameterValuePairs(
  raw: unknown,
  parameterIds: Set<string>,
): Array<readonly [string, string]> | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const out: Array<readonly [string, string]> = []

  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 2) {
      continue
    }

    const a = item[0]
    const b = item[1]

    if (typeof a !== 'string' || typeof b !== 'string' || a === b) {
      continue
    }

    if (!parameterIds.has(a) || !parameterIds.has(b)) {
      continue
    }

    const norm = a <= b ? ([a, b] as const) : ([b, a] as const)
    if (!out.some(([x, y]) => x === norm[0] && y === norm[1])) {
      out.push(norm)
    }
  }

  const used = new Set<string>()
  const filtered: Array<readonly [string, string]> = []

  for (const [a, b] of out) {
    if (used.has(a) || used.has(b)) {
      continue
    }

    used.add(a)
    used.add(b)
    filtered.push([a, b])
  }

  return filtered
}

/** Interpreta um ficheiro JSON de estruturas (ex.: `src/nodeStructures/default/`) como `NodeSchemaDefinition`. */
export function nodeSchemaFromStructureJson(raw: unknown): NodeSchemaDefinition | null {
  if (!isRecord(raw)) {
    return null
  }

  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  const structuresRaw = readInternalStructuresArray(raw)
  if (!Array.isArray(raw.parameters) || !structuresRaw) {
    return null
  }

  const parameters: NodeParameterDefinition[] = []
  for (const entry of raw.parameters) {
    const p = parseParameter(entry)
    if (!p) {
      return null
    }
    parameters.push(p)
  }

  const internalStructures: InternalStructureDefinition[] = []
  for (const entry of structuresRaw) {
    const s = parseInternalStructure(entry)
    if (!s) {
      return null
    }
    internalStructures.push(s)
  }

  const embed = parseEmbedArray(raw.embed)
  if (embed === null) {
    return null
  }

  const pointer = parsePointerArray(raw.pointer)
  if (pointer === null) {
    return null
  }

  const listEmbed = parseListEmbedArray(raw.listEmbed)
  if (listEmbed === null) {
    return null
  }

  const listPointer = parseListPointerArray(raw.listPointer)
  if (listPointer === null) {
    return null
  }

  const nomenclature = parseNomenclature(raw.nomenclature)

  const result: NodeSchemaDefinition = {
    id: raw.id,
    title: raw.title,
    parameters,
    internalStructures,
    ...(embed.length > 0 ? { embed } : {}),
    ...(pointer.length > 0 ? { pointer } : {}),
    ...(listEmbed.length > 0 ? { listEmbed } : {}),
    ...(listPointer.length > 0 ? { listPointer } : {}),
  }

  const parameterIdSet = new Set(parameters.map((parameter) => parameter.id))
  if ('required_parameter' in raw) {
    const requiredParameter = parseSchemaRequiredParameterIds(raw.required_parameter, parameterIdSet)
    if (requiredParameter === null) {
      return null
    }
    result.required_parameter = requiredParameter
  }

  if ('linked_parameter_values' in raw) {
    const linked = parseSchemaLinkedParameterValuePairs(raw.linked_parameter_values, parameterIdSet)
    if (linked === null) {
      return null
    }
    if (linked.length > 0) {
      result.linked_parameter_values = linked
    } else if (Array.isArray(raw.linked_parameter_values)) {
      result.linked_parameter_values = []
    }
  }

  if (nomenclature) {
    result.nomenclature = nomenclature
  }

  return result
}
