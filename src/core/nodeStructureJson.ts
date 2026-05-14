import type {
  InternalStructureDefinition,
  NodeDataType,
  NodeParameterDefinition,
  NodeSchemaDefinition,
  NodeStructureNomenclature,
  NomenclaturePathSegment,
} from './nodeSchema'

const NODE_DATA_TYPES: ReadonlySet<string> = new Set<NodeDataType>([
  'keyword',
  'string',
  'comment',
  'property',
  'symbol',
  'integer',
  'float',
  'double',
  'vector2',
  'vector3',
  'vector4',
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

export function nodeParameterDefinitionFromJsonStub(raw: unknown): NodeParameterDefinition | null {
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

  const nomenclature = parseNomenclature(raw.nomenclature)

  const result: NodeSchemaDefinition = {
    id: raw.id,
    title: raw.title,
    parameters,
    internalStructures,
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
